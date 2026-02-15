import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Download,
  Trash2,
  Upload,
  Loader2,
  Globe,
  Check,
  CloudDownload,
  HelpCircle,
} from 'lucide-react';
import { useBible } from '../../../context';
import { Button } from '../../../../components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../../components/ui/alert-dialog';
import { cn } from '../../../../lib/utils';

export function BibleSettingsTab() {
  const { t } = useTranslation();
  const {
    translations,
    availableBibles,
    isLoading,
    importProgress,
    importFromFile,
    downloadAndImport,
    deleteTranslation,
  } = useBible();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isInstalled = (abbreviation: string) => {
    return translations.some(
      (trans) =>
        trans.abbreviation.toLowerCase() === abbreviation.toLowerCase(),
    );
  };

  const handleDownload = async (bibleId: string) => {
    setDownloadingId(bibleId);
    try {
      await downloadAndImport(bibleId);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTranslation(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async () => {
    await importFromFile();
  };

  return (
    <div className="space-y-8 pb-4">
      {/* Installed Translations Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">
              {t('installedTranslations', 'Installed Translations')}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] text-xs">
                  <p className="font-medium mb-1">
                    {t('supportedFormats', 'Supported JSON format:')}
                  </p>
                  <code className="text-[10px] block bg-muted/50 p-1.5 rounded">
                    {`{ name, abbreviation, language, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }`}
                  </code>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              onClick={handleImport}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {t('importBibleFile', 'Import')}
            </Button>
          </div>
        </div>

        {translations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
              <BookOpen className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('noTranslationsInstalled', 'No translations installed')}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t(
                'downloadOrImport',
                'Download a translation below or import from file',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {translations.map((trans, index) => (
              <div
                key={trans.id}
                className={cn(
                  'group flex items-center justify-between py-2.5 px-1',
                  'transition-colors duration-150',
                  'hover:bg-muted/30 rounded-md -mx-1',
                  index !== translations.length - 1 &&
                    'border-b border-border/40',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {trans.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60">
                        {trans.abbreviation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {trans.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 opacity-0 group-hover:opacity-100',
                        'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                        'transition-all duration-150',
                      )}
                      disabled={deletingId === trans.id}
                    >
                      {deletingId === trans.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('deleteConfirmTitle', 'Delete Translation?')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          'deleteConfirmDescription',
                          'This will permanently delete "{{name}}" from your library. This action cannot be undone.',
                          { name: trans.name },
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t('common.cancel', 'Cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(trans.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('common.delete', 'Delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Available Downloads Section */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <CloudDownload className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">
            {t('availableDownloads', 'Available Downloads')}
          </h3>
        </div>

        <div className="space-y-1">
          {availableBibles.map((bible, index) => {
            const installed = isInstalled(bible.abbreviation);
            const isDownloading = downloadingId === bible.id;

            return (
              <div
                key={bible.id}
                className={cn(
                  'group flex items-center justify-between py-2.5 px-1',
                  'transition-colors duration-150',
                  'hover:bg-muted/30 rounded-md -mx-1',
                  index !== availableBibles.length - 1 &&
                    'border-b border-border/40',
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                      installed ? 'bg-green-500/10' : 'bg-muted/60',
                    )}
                  >
                    {installed ? (
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {bible.name}
                      </span>
                      {installed && (
                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                          {t('installed', 'Installed')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60">
                        {bible.abbreviation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {bible.language.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground/60">
                        {bible.fileSize}
                      </span>
                    </div>
                    {bible.description && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                        {bible.description}
                      </p>
                    )}
                  </div>
                </div>

                {!installed && (
                  <Button
                    onClick={() => handleDownload(bible.id)}
                    disabled={
                      isLoading || (downloadingId !== null && !isDownloading)
                    }
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'h-7 text-xs gap-1.5 ml-2 min-w-[72px] relative overflow-hidden',
                      isDownloading
                        ? 'opacity-100 bg-primary/5'
                        : 'opacity-60 group-hover:opacity-100',
                      'hover:bg-primary/10 hover:text-primary',
                      'transition-all duration-150',
                    )}
                  >
                    {isDownloading &&
                      importProgress &&
                      importProgress.progress > 0 && (
                        <div
                          className="absolute inset-0 bg-primary/15 transition-all duration-300"
                          style={{ width: `${importProgress.progress}%` }}
                        />
                      )}
                    <span className="relative flex items-center gap-1.5">
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="tabular-nums">
                            {importProgress && importProgress.progress > 0
                              ? `${importProgress.progress}%`
                              : t('downloading', 'Downloading...')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3" />
                          <span>{t('download', 'Download')}</span>
                        </>
                      )}
                    </span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-4 pl-1">
          {t(
            'publicDomainNote',
            'All available Bibles are in the public domain and free to use.',
          )}
        </p>
      </section>
    </div>
  );
}
