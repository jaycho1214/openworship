import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  RotateCcw,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Separator } from '../../../../components/ui/separator';
import { SettingsRow } from '../components/SettingsRow';
import ImportDialog from '../../ImportDialog';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

export function DataSettingsTab() {
  const { t, i18n } = useTranslation();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const expectedText = i18n.language === 'ko' ? '초기화' : 'RESET';
  const isConfirmValid = confirmText === expectedText;

  const handleExportLibrary = async () => {
    const electron = getElectron();
    if (!electron) return;

    setIsExporting(true);
    try {
      const result = await electron.export.library();
      if (result.canceled) return;
      if (result.success) {
        toast.success(t('exportSuccess'));
      } else {
        toast.error(result.error || t('exportFailed'));
      }
    } catch (err) {
      console.error('[DataSettings] Export error:', err);
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!isConfirmValid) return;

    const electron = getElectron();
    if (!electron) return;

    setIsResetting(true);
    try {
      await electron.settings.factoryReset();
      window.location.reload();
    } catch (error) {
      console.error('Factory reset failed:', error);
      setIsResetting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setConfirmText('');
      setIsResetting(false);
    }
    setIsResetDialogOpen(open);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Export Library */}
      <SettingsRow title={t('exportLibrary')} description={t('exportLibrary')}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportLibrary}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {t('exportLibrary')}
        </Button>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Import File */}
      <SettingsRow title={t('importFile')} description={t('importFile')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsImportDialogOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('importFile')}
        </Button>
      </SettingsRow>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Factory Reset */}
      <SettingsRow
        title={t('factoryReset')}
        description={t('factoryResetDescription')}
      >
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setIsResetDialogOpen(true)}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {t('factoryReset')}
        </Button>
      </SettingsRow>

      <Dialog open={isResetDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            {t('factoryReset')}
          </DialogTitle>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('factoryResetWarning')}
            </p>

            <div className="space-y-3">
              <Label htmlFor="confirm-reset" className="text-sm">
                {t('factoryResetTypeConfirm')}
              </Label>
              <Input
                id="confirm-reset"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('factoryResetTypePlaceholder')}
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isResetting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleFactoryReset}
              disabled={!isConfirmValid || isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('resetting')}
                </>
              ) : (
                t('factoryReset')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          // Optionally refresh data after import
        }}
      />
    </div>
  );
}
