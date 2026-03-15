import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Type,
  ImageIcon,
  Layers,
  PanelTop,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { getElectron } from '@/shared/hooks/useElectron';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

export interface NoteFormState {
  content: string;
  contentType: 'text' | 'image';
  displayMode: 'slide' | 'overlay';
  overlayPosition: 'top' | 'bottom';
  imagePath?: string;
  imagePreview: string | null;
}

interface NoteFormProps {
  state: NoteFormState;
  onChange: (state: NoteFormState) => void;
  autoFocusTextarea?: boolean;
}

export default function NoteForm({
  state,
  onChange,
  autoFocusTextarea,
}: NoteFormProps) {
  const { t } = useTranslation();

  const update = (partial: Partial<NoteFormState>) =>
    onChange({ ...state, ...partial });

  const handlePickImage = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.images?.add) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await electron.images.add({
          fileName: file.name,
          base64,
        });
        if (result.success && result.data) {
          onChange({
            ...state,
            imagePath: result.data,
            imagePreview: reader.result as string,
          });
        } else {
          toast.error(t('failedToUploadImage'));
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [state, onChange, t]);

  return (
    <div className="space-y-3">
      {/* Content type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          {t('content')}:
        </span>
        <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/60">
          <button
            onClick={() => update({ contentType: 'text' })}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
              state.contentType === 'text'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Type className="w-3 h-3" />
            {t('noteContentText')}
          </button>
          <button
            onClick={() => update({ contentType: 'image' })}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
              state.contentType === 'image'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ImageIcon className="w-3 h-3" />
            {t('noteContentImage')}
          </button>
        </div>
      </div>

      {/* Text content */}
      {state.contentType === 'text' && (
        <Textarea
          placeholder={t('announcementContentPlaceholder')}
          value={state.content}
          onChange={(e) => update({ content: e.target.value })}
          rows={5}
          className="resize-none text-sm"
          autoFocus={autoFocusTextarea}
        />
      )}

      {/* Image content */}
      {state.contentType === 'image' && (
        <div className="space-y-2">
          {state.imagePreview ? (
            <div className="relative rounded-md overflow-hidden border border-border">
              <img
                src={state.imagePreview}
                alt="Note"
                className="w-full max-h-40 object-contain bg-muted"
              />
              <button
                onClick={() =>
                  update({ imagePath: undefined, imagePreview: null })
                }
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-1"
              onClick={handlePickImage}
            >
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('selectImage')}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Display mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          {t('display')}:
        </span>
        <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/60">
          <button
            onClick={() => update({ displayMode: 'slide' })}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
              state.displayMode === 'slide'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers className="w-3 h-3" />
            {t('noteDisplaySlide')}
          </button>
          <button
            onClick={() => update({ displayMode: 'overlay' })}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
              state.displayMode === 'overlay'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <PanelTop className="w-3 h-3" />
            {t('noteDisplayOverlay')}
          </button>
        </div>

        {/* Position (overlay only) */}
        {state.displayMode === 'overlay' && (
          <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/60 ml-1">
            <button
              onClick={() => update({ overlayPosition: 'top' })}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                state.overlayPosition === 'top'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => update({ overlayPosition: 'bottom' })}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                state.overlayPosition === 'bottom'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function isNoteFormValid(state: NoteFormState): boolean {
  return state.contentType === 'text'
    ? state.content.trim().length > 0
    : !!state.imagePath;
}
