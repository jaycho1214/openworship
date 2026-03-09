/* eslint-disable no-console */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Trash2,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Video,
  Film,
  ChevronDown,
  Type,
  Music,
  BookOpen,
  Megaphone,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Separator } from '../../../../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Slider } from '../../../../components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../components/ui/collapsible';
import { cn } from '../../../../lib/utils';
import {
  DetectedFont,
  ProjectionSettings,
  defaultProjectionSettings,
} from '../../../../shared/types/song';
import type {
  ContentTypeTextSettings,
  TextStyleSettings,
  BibleReferenceStyle,
} from '../../../../../shared/types/settings';
import { defaultContentTypeTextSettings } from '../../../../../shared/types/settings';
import { SettingsRow } from '../components/SettingsRow';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

// Convert file path to app:// media URL for video preview
function toAppMediaUrl(filePath: string): string {
  if (filePath.startsWith('app://') || filePath.startsWith('file://')) {
    return filePath;
  }
  const encodedPath = filePath
    .split(/[/\\]/)
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `app://media${encodedPath.startsWith('/') ? '' : '/'}${encodedPath}`;
}

type ContentTypeTab = 'song' | 'bible' | 'announcement';

interface TextSettingsPanelProps {
  settings: TextStyleSettings;
  onUpdate: (updates: Partial<TextStyleSettings>) => void;
  isBible?: boolean;
  bibleReferenceStyle?: BibleReferenceStyle;
  onBibleReferenceUpdate?: (updates: Partial<BibleReferenceStyle>) => void;
  t: (key: string) => string;
}

function TextSettingsPanel({
  settings,
  onUpdate,
  isBible = false,
  bibleReferenceStyle,
  onBibleReferenceUpdate,
  t,
}: TextSettingsPanelProps) {
  return (
    <div className="space-y-3">
      {/* Bible: Verse section header */}
      {isBible && (
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t('verseText')}
        </Label>
      )}

      {/* Font Size */}
      <SettingsRow title={isBible ? t('verseFontSize') : t('fontSize')}>
        <div className="flex items-center gap-2">
          <Slider
            value={[settings.fontSize]}
            onValueChange={([value]) => onUpdate({ fontSize: value })}
            min={48}
            max={360}
            step={4}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {settings.fontSize}px
          </span>
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Text Position */}
      <div className="flex items-center justify-between gap-3 py-1">
        <Label className="text-[13px] font-medium">{t('textPosition')}</Label>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {(['top', 'middle', 'bottom'] as const).map((id) => (
              <Button
                key={id}
                variant={
                  settings.textAlign.vertical === id ? 'default' : 'ghost'
                }
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onUpdate({
                    textAlign: {
                      ...settings.textAlign,
                      vertical: id,
                    },
                  })
                }
              >
                <div
                  className={cn(
                    'w-3.5 h-4 border border-current rounded-sm flex flex-col',
                    id === 'top' && 'justify-start pt-0.5',
                    id === 'middle' && 'justify-center',
                    id === 'bottom' && 'justify-end pb-0.5',
                  )}
                >
                  <div className="w-2 h-px bg-current mx-auto" />
                </div>
              </Button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex gap-0.5">
            {(['left', 'center', 'right'] as const).map((id) => (
              <Button
                key={id}
                variant={
                  settings.textAlign.horizontal === id ? 'default' : 'ghost'
                }
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onUpdate({
                    textAlign: {
                      ...settings.textAlign,
                      horizontal: id,
                    },
                  })
                }
              >
                <div
                  className={cn(
                    'w-4 h-3.5 border border-current rounded-sm flex flex-row',
                    id === 'left' && 'justify-start pl-0.5',
                    id === 'center' && 'justify-center',
                    id === 'right' && 'justify-end pr-0.5',
                  )}
                >
                  <div className="w-px h-2 bg-current my-auto" />
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Text Alignment (CSS text-align) */}
      <SettingsRow title={t('textAlignment')}>
        <div className="flex gap-0.5">
          {[
            { id: 'left' as const, icon: AlignLeft },
            { id: 'center' as const, icon: AlignCenter },
            { id: 'right' as const, icon: AlignRight },
          ].map(({ id, icon: Icon }) => (
            <Button
              key={id}
              variant={
                (settings.textJustify ?? 'center') === id ? 'default' : 'ghost'
              }
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate({ textJustify: id })}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Line Gap */}
      <SettingsRow title={t('lineGap')}>
        <div className="flex items-center gap-2">
          <Slider
            value={[settings.lineGap ?? 12]}
            onValueChange={([value]) => onUpdate({ lineGap: value })}
            min={0}
            max={48}
            step={4}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {settings.lineGap ?? 12}px
          </span>
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Padding */}
      <SettingsRow title={t('textPadding')}>
        <div className="flex items-center gap-2">
          <Slider
            value={[settings.padding?.left ?? 5]}
            onValueChange={([value]) =>
              onUpdate({
                padding: {
                  top: value,
                  bottom: value,
                  left: value,
                  right: value,
                },
              })
            }
            min={0}
            max={20}
            step={1}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {settings.padding?.left ?? 5}%
          </span>
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Text Shadow */}
      <SettingsRow title={t('textShadow')}>
        <div className="flex items-center gap-2">
          <Slider
            value={[settings.textShadow.blur]}
            onValueChange={([blur]) =>
              onUpdate({
                textShadow: {
                  ...settings.textShadow,
                  blur,
                  enabled: blur > 0,
                },
              })
            }
            min={0}
            max={20}
            step={1}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {settings.textShadow.blur}px
          </span>
        </div>
      </SettingsRow>

      {/* Bible-specific: Reference style */}
      {isBible && bibleReferenceStyle && onBibleReferenceUpdate && (
        <>
          <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">
            {t('referenceText')}
          </Label>

          <SettingsRow title={t('referenceFontSize')}>
            <div className="flex items-center gap-2">
              <Slider
                value={[bibleReferenceStyle.fontSize]}
                onValueChange={([value]) =>
                  onBibleReferenceUpdate({ fontSize: value })
                }
                min={24}
                max={280}
                step={4}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                {bibleReferenceStyle.fontSize}px
              </span>
            </div>
          </SettingsRow>

          <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

          <SettingsRow title={t('referenceTextColor')}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bibleReferenceStyle.textColor}
                onChange={(e) =>
                  onBibleReferenceUpdate({ textColor: e.target.value })
                }
                className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent p-0.5"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {bibleReferenceStyle.textColor}
              </span>
            </div>
          </SettingsRow>
        </>
      )}
    </div>
  );
}

interface DisplaySettingsTabProps {
  fonts: DetectedFont[];
  selectedFont: string;
  onFontSelect: (fontName: string) => void;
  isLoading: boolean;
  loadedFonts: Set<string>;
  onFontsChange?: () => void;
  videos?: string[];
  onVideosChange?: () => void;
}

export function DisplaySettingsTab({
  fonts,
  selectedFont,
  onFontSelect,
  isLoading,
  loadedFonts,
  onFontsChange,
  videos = [],
  onVideosChange,
}: DisplaySettingsTabProps) {
  const { t } = useTranslation();
  const [projectionSettings, setProjectionSettings] =
    useState<ProjectionSettings>(defaultProjectionSettings);
  const [contentTypeTextSettings, setContentTypeTextSettings] =
    useState<ContentTypeTextSettings>(defaultContentTypeTextSettings);
  const [activeContentTab, setActiveContentTab] =
    useState<ContentTypeTab>('song');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingFont, setIsAddingFont] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isFontsOpen, setIsFontsOpen] = useState(true);
  const [isVideosOpen, setIsVideosOpen] = useState(true);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVideoMouseEnter = useCallback((videoPath: string) => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredVideo(videoPath);
    }, 300);
  }, []);

  const handleVideoMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredVideo(null);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const electron = getElectron();
      if (!electron) {
        setIsLoadingSettings(false);
        return;
      }

      try {
        const settings = await electron.settings.getProjection();
        setProjectionSettings((prev: ProjectionSettings) => ({
          ...prev,
          ...settings,
          textShadow: { ...prev.textShadow, ...settings.textShadow },
          textOutline: { ...prev.textOutline, ...settings.textOutline },
          textAlign: { ...prev.textAlign, ...settings.textAlign },
          padding: { ...prev.padding, ...settings.padding },
        }));
      } catch (error) {
        console.error('Failed to load projection settings:', error);
      }

      // Load content-type text settings
      try {
        const result = await electron.settings.getContentTypeText();
        if (result.success && result.data) {
          setContentTypeTextSettings(result.data);
        }
      } catch (error) {
        console.error('Failed to load content type text settings:', error);
      }

      setIsLoadingSettings(false);
    };
    loadSettings();
  }, []);

  const updateGlobalSettings = async (updates: Partial<ProjectionSettings>) => {
    const electron = getElectron();
    if (!electron) return;

    const newSettings = { ...projectionSettings, ...updates };
    setProjectionSettings(newSettings);
    await electron.settings.setProjection(newSettings);
  };

  const updateContentTypeText = async (
    type: ContentTypeTab,
    updates: Partial<TextStyleSettings>,
  ) => {
    const electron = getElectron();
    if (!electron) return;

    // Optimistic update
    setContentTypeTextSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...updates },
    }));

    try {
      const result = await electron.settings.setContentTypeText(type, updates);
      if (result.success && result.data) {
        setContentTypeTextSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to update content type text settings:', error);
    }
  };

  const updateBibleReferenceStyle = async (
    updates: Partial<BibleReferenceStyle>,
  ) => {
    const electron = getElectron();
    if (!electron) return;

    // Optimistic update
    setContentTypeTextSettings((prev) => ({
      ...prev,
      bible: {
        ...prev.bible,
        referenceStyle: { ...prev.bible.referenceStyle, ...updates },
      },
    }));

    try {
      const result = await electron.settings.setBibleReferenceStyle(updates);
      if (result.success && result.data) {
        setContentTypeTextSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to update bible reference style:', error);
    }
  };

  // Font drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    const electron = getElectron();
    if (!electron) return;

    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const fontFiles = files.filter((f) =>
      fontExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );

    if (fontFiles.length === 0) return;

    setIsAddingFont(true);

    for (const file of fontFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await electron.fonts.add({ fileName: file.name, base64 });
      } catch (error) {
        console.error(`Failed to add font ${file.name}:`, error);
      }
    }

    setIsAddingFont(false);
    onFontsChange?.();
  };

  const handleDeleteFont = async (fileName: string) => {
    const electron = getElectron();
    if (!electron) return;

    try {
      await electron.fonts.delete(fileName);
      onFontsChange?.();
    } catch (error) {
      console.error('Failed to delete font:', error);
    }
  };

  // Video handlers
  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragOver(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragOver(false);
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await processVideoFiles(files);
  };

  const handleVideoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processVideoFiles(files);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const processVideoFiles = async (files: File[]) => {
    const electron = getElectron();
    if (!electron) return;

    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const videoFiles = files.filter((f) =>
      videoExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );

    if (videoFiles.length === 0) return;

    setIsAddingVideo(true);

    for (const file of videoFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await electron.videos.add({ fileName: file.name, base64 });
      } catch (error) {
        console.error(`Failed to add video ${file.name}:`, error);
      }
    }

    setIsAddingVideo(false);
    onVideosChange?.();
  };

  const handleDeleteVideo = async (fileName: string) => {
    const electron = getElectron();
    if (!electron) return;

    try {
      await electron.videos.delete(fileName);
      onVideosChange?.();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const userFonts = fonts;
  const userVideos = videos.map((path) => path.split(/[/\\]/).pop() || path);

  const contentTabs: {
    id: ContentTypeTab;
    labelKey: string;
    icon: typeof Music;
  }[] = [
    { id: 'song', labelKey: 'songTextSettings', icon: Music },
    { id: 'bible', labelKey: 'bibleTextSettings', icon: BookOpen },
    {
      id: 'announcement',
      labelKey: 'announcementTextSettings',
      icon: Megaphone,
    },
  ];

  if (isLoadingSettings) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Font Management - Collapsible */}
      <Collapsible open={isFontsOpen} onOpenChange={setIsFontsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Label className="text-[13px] font-medium cursor-pointer group-hover:text-foreground transition-colors">
              {t('projectionFont')}
            </Label>
            {userFonts.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({userFonts.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                isFontsOpen && 'rotate-180',
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {/* System Font Option */}
              {(() => {
                const isSystemSelected =
                  selectedFont === 'system' || selectedFont === '';
                return (
                  <div
                    onClick={() => onFontSelect('system')}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all',
                      isSystemSelected ? 'bg-active' : 'hover:bg-muted/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        isSystemSelected
                          ? 'border-foreground bg-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSystemSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-background" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm flex-1 transition-colors',
                        isSystemSelected
                          ? 'text-foreground font-medium'
                          : 'text-foreground/80',
                      )}
                    >
                      {t('systemFont')}
                    </span>
                  </div>
                );
              })()}

              {/* User Fonts */}
              {userFonts.map((font) => {
                const isSelected = selectedFont === font.name;
                return (
                  <div
                    key={font.fileName}
                    onClick={() => onFontSelect(font.name)}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all',
                      isSelected ? 'bg-active' : 'hover:bg-muted/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        isSelected
                          ? 'border-foreground bg-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-background" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm flex-1 break-all transition-colors',
                        isSelected
                          ? 'text-foreground font-medium'
                          : 'text-foreground/80',
                      )}
                      style={{
                        fontFamily: loadedFonts.has(font.name)
                          ? `"${font.name}"`
                          : 'inherit',
                      }}
                    >
                      {font.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFont(font.fileName);
                      }}
                      className="p-1.5 rounded text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title={t('deleteFont')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-t border-dashed cursor-pointer transition-all',
                isDragOver
                  ? 'border-foreground bg-muted'
                  : 'border-border hover:bg-muted/30',
                isAddingFont && 'pointer-events-none opacity-50',
                userFonts.length === 0 && 'border-t-0',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2.5">
                {isAddingFont ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isAddingFont ? t('addingFonts') : t('dropFontFiles')}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Video Management Section - Collapsible */}
      <Collapsible open={isVideosOpen} onOpenChange={setIsVideosOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <Label className="text-[13px] font-medium cursor-pointer group-hover:text-foreground transition-colors">
              {t('backgroundVideos')}
            </Label>
            {userVideos.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({userVideos.length})
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              isVideosOpen && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 space-y-3">
          <div
            onDragOver={handleVideoDragOver}
            onDragLeave={handleVideoDragLeave}
            onDrop={handleVideoDrop}
            onClick={() => videoInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-3 cursor-pointer transition-all',
              isVideoDragOver
                ? 'border-foreground bg-muted'
                : 'border-border hover:border-muted-foreground hover:bg-muted/30',
              isAddingVideo && 'pointer-events-none opacity-50',
            )}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.webm,.mov,.avi,.mkv"
              multiple
              className="hidden"
              onChange={handleVideoInput}
            />
            <div className="flex items-center gap-3">
              {isAddingVideo ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : (
                <Video className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">
                  {isAddingVideo ? t('addingVideos') : t('addBackgroundVideos')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t('dropVideoFiles')}
                </p>
              </div>
            </div>
          </div>

          {userVideos.length > 0 && (
            <div className="space-y-1">
              {userVideos.map((videoName, index) => (
                <div
                  key={videos[index]}
                  className="relative"
                  onMouseEnter={() => handleVideoMouseEnter(videos[index])}
                  onMouseLeave={handleVideoMouseLeave}
                >
                  <div className="flex items-start gap-2 px-2 py-1.5 rounded bg-muted/30 group">
                    <Video className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground flex-1 break-all">
                      {videoName}
                    </span>
                    <button
                      onClick={() => handleDeleteVideo(videos[index])}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-all flex-shrink-0"
                      title={t('deleteVideo')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {hoveredVideo === videos[index] && (
                    <div className="mt-1 rounded-lg overflow-hidden border border-border bg-black">
                      <video
                        src={toAppMediaUrl(videos[index])}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Per-Content-Type Text Settings */}
      <div className="space-y-3">
        <Label className="text-[13px] font-medium">{t('textSettings')}</Label>

        {/* Content Type Tabs */}
        <div className="flex border-b border-border -mx-5 px-5">
          {contentTabs.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveContentTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px',
                activeContentTab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Text settings for the active content type */}
        <TextSettingsPanel
          key={activeContentTab}
          settings={contentTypeTextSettings[activeContentTab]}
          onUpdate={(updates) =>
            updateContentTypeText(activeContentTab, updates)
          }
          isBible={activeContentTab === 'bible'}
          bibleReferenceStyle={
            activeContentTab === 'bible'
              ? contentTypeTextSettings.bible.referenceStyle
              : undefined
          }
          onBibleReferenceUpdate={
            activeContentTab === 'bible' ? updateBibleReferenceStyle : undefined
          }
          t={t}
        />
      </div>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Background Dim */}
      <SettingsRow title={t('backgroundDim')}>
        <div className="flex items-center gap-2">
          <Slider
            value={[projectionSettings.backgroundDim]}
            onValueChange={([value]) =>
              updateGlobalSettings({ backgroundDim: value })
            }
            min={0}
            max={80}
            step={5}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {projectionSettings.backgroundDim}%
          </span>
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Animation */}
      <SettingsRow title={t('slideAnimation')}>
        <Select
          value={projectionSettings.animation}
          onValueChange={(
            animation: 'none' | 'fade' | 'slide-up' | 'slide-left',
          ) => updateGlobalSettings({ animation })}
        >
          <SelectTrigger className="w-28 bg-muted/30 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('animationNone')}</SelectItem>
            <SelectItem value="fade">{t('animationFade')}</SelectItem>
            <SelectItem value="slide-up">{t('animationSlideUp')}</SelectItem>
            <SelectItem value="slide-left">
              {t('animationSlideLeft')}
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Display Mode */}
      <SettingsRow title={t('displayMode')}>
        <Select
          value={projectionSettings.displayMode}
          onValueChange={async (mode: 'fullscreen' | 'windowed') => {
            updateGlobalSettings({ displayMode: mode });
            const electron = getElectron();
            if (electron) {
              await electron.projection.setDisplayMode(mode);
            }
          }}
        >
          <SelectTrigger className="w-28 bg-muted/30 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fullscreen">{t('fullscreen')}</SelectItem>
            <SelectItem value="windowed">{t('windowed')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </div>
  );
}
