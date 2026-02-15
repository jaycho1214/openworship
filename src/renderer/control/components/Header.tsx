import { useTranslation } from 'react-i18next';
import { Monitor, MonitorOff, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { useProjection } from '../context';
import { cn } from '../../lib/utils';
import { AboutTab } from './settings/tabs';

export default function Header() {
  const { t } = useTranslation();
  const { isProjectionOpen, openProjection, closeProjection } = useProjection();

  return (
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

      {/* Right: Info + Projection Control */}
      <div className="flex items-center gap-2">
        {/* About / Info */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-lg',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
              title={t('about')}
              aria-label={t('about')}
            >
              <Info className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-[380px] p-4">
            <AboutTab />
          </PopoverContent>
        </Popover>

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
  );
}
