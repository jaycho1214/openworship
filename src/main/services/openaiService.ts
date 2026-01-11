import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { settingsService } from './settings';

// Zod schema for structured lyrics extraction
const ParsedSongSchema = z.object({
  title: z
    .string()
    .describe(
      'The title of the song, or "제목 없음" if not visible, or "인식 불가" if image cannot be processed',
    ),
  lyrics: z
    .string()
    .describe(
      'The extracted lyrics with proper line grouping. Lines within a group separated by \\n, groups separated by \\n\\n',
    ),
});

type ParsedSong = z.infer<typeof ParsedSongSchema>;

// Export for use in other files
export type { ParsedSong };

// Interface for batch OCR result
export interface BatchOCRResult {
  index: number;
  pageNumber?: number;
  success: boolean;
  data?: ParsedSong;
  error?: string;
  imagePreview?: string; // Small thumbnail for UI preview
}

// Get OpenAI client using API key from settings
const getOpenAIClient = (apiKey?: string) => {
  const key = apiKey || settingsService.getApiKey();
  if (!key) {
    throw new Error(
      'OpenAI API key is not configured. Please add your API key in Settings.',
    );
  }
  return new OpenAI({ apiKey: key });
};

// Load prompt from markdown file
const loadPrompt = (filename: string): string => {
  // In development, prompts are in src/main/prompts/
  // In production, they're bundled in the resources folder
  const isDev = process.env.NODE_ENV === 'development';
  const promptPath = isDev
    ? path.join(app.getAppPath(), 'src', 'main', 'prompts', filename)
    : path.join(process.resourcesPath, 'prompts', filename);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  return fs.readFileSync(promptPath, 'utf-8').trim();
};

/**
 * Parse lyrics from an image using GPT-5.2 Vision with Structured Outputs
 * @param imageBase64 Base64 encoded image data (without data:image prefix)
 * @param mimeType Image MIME type (e.g., 'image/png', 'image/jpeg')
 */
export async function parseLyricsFromImage(
  imageBase64: string,
  mimeType: string = 'image/png',
): Promise<ParsedSong> {
  const openai = getOpenAIClient();
  const systemPrompt = loadPrompt('ocr-lyrics.md');

  const response = await openai.responses.parse({
    model: 'gpt-5.2',
    reasoning: {
      effort: 'medium',
    },
    input: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: `data:${mimeType};base64,${imageBase64}`,
            detail: 'high',
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(ParsedSongSchema, 'parsed_song'),
    },
  });

  // Handle incomplete response (e.g., max tokens reached)
  if (response.status === 'incomplete') {
    const reason = response.incomplete_details?.reason;
    if (reason === 'max_output_tokens') {
      throw new Error(
        'Response was cut off due to token limit. Image may contain too much text.',
      );
    }
    if (reason === 'content_filter') {
      throw new Error('Response was filtered due to content restrictions.');
    }
    throw new Error(`Incomplete response: ${reason}`);
  }

  // Handle refusal
  const output = response.output?.[0];
  if (output?.type === 'message') {
    const content = output.content?.[0];
    if (content?.type === 'refusal') {
      throw new Error(`Model refused to process: ${content.refusal}`);
    }
  }

  // Get parsed output
  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error('No parsed output from OpenAI');
  }

  return {
    title: parsed.title || '제목 없음',
    lyrics: parsed.lyrics || '',
  };
}

/**
 * Process multiple image files with OCR
 * @param images Array of image data { base64, mimeType }
 * @param onProgress Optional callback for progress updates
 */
export async function parseLyricsFromImages(
  images: Array<{ base64: string; mimeType: string }>,
  onProgress?: (current: number, total: number) => void,
): Promise<BatchOCRResult[]> {
  log.info(`[OCR] Starting batch processing of ${images.length} images`);

  const results: BatchOCRResult[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    if (onProgress) {
      onProgress(i + 1, images.length);
    }

    try {
      const parsed = await parseLyricsFromImage(image.base64, image.mimeType);

      results.push({
        index: i,
        success: true,
        data: parsed,
        imagePreview: `data:${image.mimeType};base64,${image.base64}`,
      });

      log.info(`[OCR] Image ${i + 1} processed: "${parsed.title}"`);
    } catch (error) {
      log.error(`[OCR] Failed to process image ${i + 1}:`, error);
      results.push({
        index: i,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        imagePreview: `data:${image.mimeType};base64,${image.base64}`,
      });
    }
  }

  return results;
}
