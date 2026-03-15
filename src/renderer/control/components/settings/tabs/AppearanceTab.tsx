import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';
import { getElectron } from '@/shared/hooks/useElectron';
import { Button } from '../../../../components/ui/button';
import { Separator } from '../../../../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { SettingsRow } from '../components/SettingsRow';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ko';

interface AppearanceTabProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  language: Language;
  onLanguageChange?: (language: Language) => void;
}

export function AppearanceTab({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
}: AppearanceTabProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lng: Language) => {
    onLanguageChange?.(lng);
    i18n.changeLanguage(lng);
    const electron = getElectron();
    if (electron) {
      electron.settings.setLanguage(lng);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    onThemeChange(newTheme);
    const electron = getElectron();
    if (electron) {
      electron.settings.setTheme(newTheme);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Theme */}
      <SettingsRow title={t('theme')} description={t('themeDescription')}>
        <div className="flex gap-1">
          {[
            { id: 'light' as Theme, icon: Sun },
            { id: 'dark' as Theme, icon: Moon },
            { id: 'system' as Theme, icon: Monitor },
          ].map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.id;
            return (
              <Button
                key={option.id}
                variant={isSelected ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleThemeChange(option.id)}
                data-testid={`theme-${option.id}`}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Language */}
      <SettingsRow title={t('language')} description={t('languageDescription')}>
        <Select
          value={language}
          onValueChange={(v) => handleLanguageChange(v as Language)}
        >
          <SelectTrigger
            className="w-28 bg-muted/30 h-8 text-xs"
            data-testid="language-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ko">한국어</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </div>
  );
}
