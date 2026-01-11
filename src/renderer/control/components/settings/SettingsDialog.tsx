import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Palette, Monitor, Info, Database } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';
import { DetectedFont } from '../../../shared/types/song';
import {
  ApiSettingsTab,
  AppearanceTab,
  DisplaySettingsTab,
  DataSettingsTab,
  AboutTab,
} from './tabs';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ko';
type SettingsTab = 'api' | 'appearance' | 'display' | 'data' | 'about';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Theme
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  // Language
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  // Fonts
  fonts: DetectedFont[];
  selectedFont: string;
  onFontSelect: (fontName: string) => void;
  fontsLoading?: boolean;
  onFontsChange?: () => void;
  // Videos
  videos?: string[];
  onVideosChange?: () => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  language = 'ko',
  onLanguageChange,
  fonts,
  selectedFont,
  onFontSelect,
  fontsLoading = false,
  onFontsChange,
  videos = [],
  onVideosChange,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');
  const loadedFontsRef = useRef<Set<string>>(new Set());

  // Load font faces for preview
  useEffect(() => {
    const loadFonts = async () => {
      for (const font of fonts) {
        if (!loadedFontsRef.current.has(font.name)) {
          try {
            const fontFace = new FontFace(font.name, `url(${font.dataUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFontsRef.current.add(font.name);
          } catch (error) {
            console.error(`Failed to load font ${font.name}:`, error);
          }
        }
      }
    };
    if (fonts.length > 0) {
      loadFonts();
    }
  }, [fonts]);

  const navItems = [
    { id: 'api' as SettingsTab, label: t('apiSettings'), icon: Key },
    {
      id: 'appearance' as SettingsTab,
      label: t('appearanceSettings'),
      icon: Palette,
    },
    {
      id: 'display' as SettingsTab,
      label: t('displaySettings'),
      icon: Monitor,
    },
    {
      id: 'data' as SettingsTab,
      label: t('dataSettings'),
      icon: Database,
    },
    { id: 'about' as SettingsTab, label: t('about'), icon: Info },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[780px] p-0 gap-0 overflow-hidden',
          'bg-background border-border',
        )}
      >
        <DialogTitle className="sr-only">{t('settings')}</DialogTitle>

        <div className="flex h-[480px]">
          {/* Left Sidebar */}
          <div className="w-[180px] border-r border-border bg-muted/20 flex flex-col">
            <div className="h-11 px-4 flex items-center border-b border-border">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                {t('settings')}
              </h2>
            </div>
            <nav className="flex-1 p-1.5 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left',
                      'transition-all duration-150 group',
                      isActive
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 flex-shrink-0',
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="text-[13px] font-medium truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Content Header */}
            <div className="h-11 px-5 flex items-center border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                {navItems.find((item) => item.id === activeTab)?.label}
              </h3>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === 'api' && <ApiSettingsTab isOpen={open} />}

              {activeTab === 'appearance' && (
                <AppearanceTab
                  theme={theme}
                  onThemeChange={onThemeChange}
                  language={language}
                  onLanguageChange={onLanguageChange}
                />
              )}

              {activeTab === 'display' && (
                <div className="animate-in fade-in duration-200">
                  <DisplaySettingsTab
                    fonts={fonts}
                    selectedFont={selectedFont}
                    onFontSelect={onFontSelect}
                    isLoading={fontsLoading}
                    loadedFonts={loadedFontsRef.current}
                    onFontsChange={onFontsChange}
                    videos={videos}
                    onVideosChange={onVideosChange}
                  />
                </div>
              )}

              {activeTab === 'data' && (
                <div className="animate-in fade-in duration-200 h-full">
                  <DataSettingsTab />
                </div>
              )}

              {activeTab === 'about' && (
                <div className="animate-in fade-in duration-200 h-full">
                  <AboutTab />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
