import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Monitor, Book, ChevronRight, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Separator } from '../../../components/ui/separator';
import { cn } from '../../../lib/utils';
import { DetectedFont } from '../../../shared/types/song';
import { useFontLoader } from '../../../shared/hooks/useFontLoader';
import {
  ApiSettingsTab,
  AppearanceTab,
  DisplaySettingsTab,
  DataSettingsTab,
  BibleSettingsTab,
  FrameSettingsTab,
} from './tabs';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ko';
type SettingsTab = 'general' | 'display' | 'bible';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { loadedFontsRef } = useFontLoader(fonts);

  const navItems = [
    {
      id: 'general' as SettingsTab,
      label: t('generalSettings'),
      icon: Settings,
    },
    {
      id: 'display' as SettingsTab,
      label: t('displaySettings'),
      icon: Monitor,
    },
    {
      id: 'bible' as SettingsTab,
      label: t('bibleSettings'),
      icon: Book,
    },
  ];

  return (
    <>
      {/* Collapsed state - clickable bar */}
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          className="flex-shrink-0 border-l border-border bg-card/30 w-10 flex flex-col items-center py-4 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
          <div className="mt-6 flex-1 flex items-start">
            <span className="[writing-mode:vertical-rl] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('settings')}
            </span>
          </div>
        </button>
      )}

      {/* Expanded state */}
      <div
        className={cn(
          'flex-shrink-0 border-l border-border bg-card/30 transition-all duration-300 ease-in-out overflow-hidden',
          open ? 'w-[420px]' : 'w-0',
        )}
      >
        <div className="w-[420px] flex flex-col h-full">
          {/* Header */}
          <div className="h-12 px-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t('settings')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tab navigation - horizontal */}
          <div className="border-b border-border px-2 flex items-center flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap',
                    'transition-colors duration-150 border-b-2 -mb-px',
                    isActive
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* General: Appearance + API + Data */}
            {activeTab === 'general' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <AppearanceTab
                  theme={theme}
                  onThemeChange={onThemeChange}
                  language={language}
                  onLanguageChange={onLanguageChange}
                />

                <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

                <ApiSettingsTab isOpen={open} />

                <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

                <DataSettingsTab />
              </div>
            )}

            {/* Display + Frame merged */}
            {activeTab === 'display' && (
              <div className="space-y-4 animate-in fade-in duration-200">
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

                <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

                <FrameSettingsTab />
              </div>
            )}

            {/* Bible */}
            {activeTab === 'bible' && (
              <div className="animate-in fade-in duration-200 h-full">
                <BibleSettingsTab />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
