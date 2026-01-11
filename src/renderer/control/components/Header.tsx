import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, MonitorOff, Settings } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useProjection, useMedia } from '../context';
import { cn } from '../../lib/utils';
import SettingsDialog from './SettingsDialog';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ko';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { isProjectionOpen, openProjection, closeProjection } = useProjection();
  const {
    fontFamily,
    setFontFamily,
    detectedFonts,
    fontsLoading,
    loadFonts,
    embeddedVideos,
    loadVideos,
  } = useMedia();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('ko');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from electron-store on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.settings.getAll();
        setTheme(settings.theme);
        setLanguage(settings.language);
        // Sync i18n with saved language
        if (settings.language !== i18n.language) {
          i18n.changeLanguage(settings.language);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [i18n]);

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme, isLoading]);

  return (
    <>
      <header className="h-14 border-b border-border bg-card px-5 flex items-center justify-between">
        {/* Left: Title + Scripture */}
        <div className="flex items-center gap-4">
          {/* Title Block */}
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">
              OpenWorship
            </h1>
            <p className="text-[10px] text-muted-foreground/70 font-medium italic tracking-wide">
              {t('bibleVerse')}
            </p>
          </div>
        </div>

        {/* Right: Settings + Projection Control */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'h-9 w-9 rounded-lg',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
            title={t('settings')}
            aria-label={t('settings')}
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Projection Control */}
          {isProjectionOpen ? (
            <Button
              variant="outline"
              size="default"
              onClick={closeProjection}
              className={cn(
                'gap-2.5 h-10 px-4 transition-all duration-200',
                'bg-foreground text-background border-foreground',
                'hover:bg-foreground/90 hover:border-foreground/90',
              )}
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">{t('projectionOpen')}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-background" />
              </span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="default"
              onClick={openProjection}
              className={cn(
                'gap-2.5 h-10 px-4 transition-all duration-200',
                'bg-muted border-border text-foreground',
                'hover:bg-accent hover:text-foreground hover:border-border',
              )}
            >
              <MonitorOff className="w-4 h-4" />
              <span className="text-sm font-medium">{t('openProjection')}</span>
            </Button>
          )}
        </div>
      </header>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        language={language}
        onLanguageChange={setLanguage}
        fonts={detectedFonts}
        selectedFont={fontFamily}
        onFontSelect={setFontFamily}
        fontsLoading={fontsLoading}
        onFontsChange={loadFonts}
        videos={embeddedVideos}
        onVideosChange={loadVideos}
      />
    </>
  );
}
