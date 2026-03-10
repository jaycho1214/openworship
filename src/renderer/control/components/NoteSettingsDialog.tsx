import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { basename } from '../../shared/utils/fileHelpers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import type { AnnouncementSetlistItem } from '../../../shared/types/setlistItem';
import NoteForm, { NoteFormState, isNoteFormValid } from './NoteForm';

interface NoteSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AnnouncementSetlistItem;
  onSave: (updates: {
    title: string;
    content: string;
    displayMode: 'slide' | 'overlay';
    contentType: 'text' | 'image';
    imagePath?: string;
    overlayPosition: 'top' | 'bottom';
  }) => void;
}

export default function NoteSettingsDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: NoteSettingsDialogProps) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<NoteFormState>({
    content: item.content,
    contentType: item.contentType || 'text',
    displayMode: item.displayMode || 'slide',
    overlayPosition: item.overlayPosition || 'bottom',
    imagePath: item.imagePath,
    imagePreview: item.imagePath ? `file://${item.imagePath}` : null,
  });

  // Reset state when item changes
  useEffect(() => {
    if (open) {
      setFormState({
        content: item.content,
        contentType: item.contentType || 'text',
        displayMode: item.displayMode || 'slide',
        overlayPosition: item.overlayPosition || 'bottom',
        imagePath: item.imagePath,
        imagePreview: item.imagePath ? `file://${item.imagePath}` : null,
      });
    }
  }, [open, item]);

  const handleSave = useCallback(() => {
    const title =
      formState.contentType === 'image'
        ? (formState.imagePath ? basename(formState.imagePath) : null) ||
          t('contentAnnouncement')
        : formState.content.trim().split('\n')[0]?.substring(0, 50) ||
          t('contentAnnouncement');

    onSave({
      title,
      content:
        formState.contentType === 'image'
          ? formState.imagePath || ''
          : formState.content,
      displayMode: formState.displayMode,
      contentType: formState.contentType,
      imagePath: formState.imagePath,
      overlayPosition: formState.overlayPosition,
    });
    onOpenChange(false);
  }, [formState, onSave, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-3.5 pb-2.5">
          <DialogTitle className="text-sm font-semibold">
            {t('noteSettings')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          <NoteForm state={formState} onChange={setFormState} />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isNoteFormValid(formState)}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
