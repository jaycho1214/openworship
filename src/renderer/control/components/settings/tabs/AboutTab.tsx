import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ExternalLink,
  Github,
  Heart,
  Scale,
  User,
} from 'lucide-react';
import { appVersion } from '@/shared/appVersion';
import { cn } from '../../../../lib/utils';
import selahLogo from '../../../../../../assets/images/selah.png';
import appLogo from '../../../../../../assets/icon.png';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  accent?: string;
}

function InfoCard({ icon, title, subtitle, href, accent }: CardProps) {
  const content = (
    <div
      className={cn(
        'group relative aspect-square p-4 rounded-xl',
        'bg-zinc-50 dark:bg-zinc-900',
        'border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800/80',
        'transition-all duration-200 ease-out',
        'flex flex-col',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center mb-auto',
          accent ||
            'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="mt-auto">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
          {title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* External link indicator */}
      {href && (
        <ExternalLink
          className="
            absolute top-3 right-3 w-3.5 h-3.5
            text-zinc-400 dark:text-zinc-600
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          "
        />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}

export function AboutTab() {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full flex flex-col">
      {/* Hero - Left aligned */}
      <div className="flex items-start gap-4 pb-4">
        {/* Logo */}
        <img
          src={appLogo}
          alt="OpenWorship"
          className="w-14 h-14 rounded-xl flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t('appName')}
            </h2>
            <span className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
              v{appVersion}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('aboutDescription')}
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5 pb-2">
        <InfoCard
          icon={<Github className="w-4 h-4" />}
          title={t('sourceCode')}
          subtitle="GitHub"
          href="https://github.com/jaycho1214/openworship"
          accent="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
        />
        <InfoCard
          icon={<AlertCircle className="w-4 h-4" />}
          title={t('reportIssue')}
          subtitle={t('feedback')}
          href="https://github.com/jaycho1214/openworship/issues"
          accent="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
        />
        <InfoCard
          icon={<Scale className="w-4 h-4" />}
          title="MIT"
          subtitle={t('license')}
          href="https://opensource.org/licenses/MIT"
          accent="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
        />
        <InfoCard
          icon={<User className="w-4 h-4" />}
          title={t('developer')}
          subtitle={t('developerName')}
          accent="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
          href="https://github.com/jaycho1214"
        />
        <InfoCard
          icon={
            <img
              src={selahLogo}
              alt="Selah"
              className="w-full h-full object-contain rounded-lg"
            />
          }
          title={t('developerProject')}
          subtitle={t('christianCommunity')}
          href="https://selah.kr"
        />
        <InfoCard
          icon={<Heart className="w-4 h-4" />}
          title={t('donate')}
          subtitle={t('donateDescription')}
          href="https://buymeacoffee.com/jaycho1214"
          accent="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
        />
      </div>
    </div>
  );
}
