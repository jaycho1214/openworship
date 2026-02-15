import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Type, Move, Maximize } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';
import { Slide, SlideOverrides } from '../../shared/types/song';

interface SlideSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slide: Slide | null;
  defaultFontSize: number;
  onSave: (
    lines: string[],
    section?: string,
    overrides?: SlideOverrides,
  ) => void;
}

type Tab = 'content' | 'style';

export default function SlideSettingsDialog({
  open,
  onOpenChange,
  slide,
  defaultFontSize,
  onSave,
}: SlideSettingsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('content');

  const [editText, setEditText] = useState('');
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [horizontalAlign, setHorizontalAlign] = useState<
    'left' | 'center' | 'right' | null
  >(null);
  const [verticalAlign, setVerticalAlign] = useState<
    'top' | 'middle' | 'bottom' | null
  >(null);
  const [paddingTop, setPaddingTop] = useState<number | null>(null);
  const [paddingBottom, setPaddingBottom] = useState<number | null>(null);
  const [paddingLeft, setPaddingLeft] = useState<number | null>(null);
  const [paddingRight, setPaddingRight] = useState<number | null>(null);

  useEffect(() => {
    if (open && slide) {
      setActiveTab('content');
      setEditText(slide.lines.join('\n'));
      setFontSize(slide.overrides?.fontSize ?? slide.fontSize ?? null);
      setHorizontalAlign(slide.overrides?.textAlign?.horizontal ?? null);
      setVerticalAlign(slide.overrides?.textAlign?.vertical ?? null);
      setPaddingTop(slide.overrides?.padding?.top ?? null);
      setPaddingBottom(slide.overrides?.padding?.bottom ?? null);
      setPaddingLeft(slide.overrides?.padding?.left ?? null);
      setPaddingRight(slide.overrides?.padding?.right ?? null);
    }
  }, [open, slide]);

  const handleSave = () => {
    const lines = editText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
    if (lines.length === 0) {
      onOpenChange(false);
      return;
    }
    const overrides: SlideOverrides = {};
    if (fontSize !== null) overrides.fontSize = fontSize;
    if (horizontalAlign !== null || verticalAlign !== null) {
      overrides.textAlign = {
        horizontal: horizontalAlign ?? 'center',
        vertical: verticalAlign ?? 'middle',
      };
    }
    if (
      paddingTop !== null ||
      paddingBottom !== null ||
      paddingLeft !== null ||
      paddingRight !== null
    ) {
      overrides.padding = {
        top: paddingTop ?? 5,
        bottom: paddingBottom ?? 5,
        left: paddingLeft ?? 5,
        right: paddingRight ?? 5,
      };
    }
    const hasOverrides = Object.keys(overrides).length > 0;
    onSave(lines, slide?.section, hasOverrides ? overrides : undefined);
    onOpenChange(false);
  };

  const handleReset = () => {
    setFontSize(null);
    setHorizontalAlign(null);
    setVerticalAlign(null);
    setPaddingTop(null);
    setPaddingBottom(null);
    setPaddingLeft(null);
    setPaddingRight(null);
  };

  if (!slide) return null;

  const positions: {
    h: 'left' | 'center' | 'right';
    v: 'top' | 'middle' | 'bottom';
  }[] = [
    { h: 'left', v: 'top' },
    { h: 'center', v: 'top' },
    { h: 'right', v: 'top' },
    { h: 'left', v: 'middle' },
    { h: 'center', v: 'middle' },
    { h: 'right', v: 'middle' },
    { h: 'left', v: 'bottom' },
    { h: 'center', v: 'bottom' },
    { h: 'right', v: 'bottom' },
  ];

  const hasCustomPosition = horizontalAlign !== null || verticalAlign !== null;
  const effectiveH = horizontalAlign ?? 'center';
  const effectiveV = verticalAlign ?? 'middle';

  const effectivePadding = {
    top: paddingTop ?? 5,
    right: paddingRight ?? 5,
    bottom: paddingBottom ?? 5,
    left: paddingLeft ?? 5,
  };

  const hasAnyOverride =
    fontSize !== null ||
    hasCustomPosition ||
    paddingTop !== null ||
    paddingBottom !== null ||
    paddingLeft !== null ||
    paddingRight !== null;

  const tabs = [
    { id: 'content' as Tab, label: t('content') },
    { id: 'style' as Tab, label: t('style') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('slideSettings')}</DialogTitle>

        <div className="flex flex-col h-[520px]">
          {/* Header with tabs */}
          <div className="flex items-center justify-between h-11 px-4 border-b border-border">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {hasAnyOverride && activeTab === 'style' && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('resetToDefault')}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === 'content' && (
              <div className="space-y-2">
                <Label>{t('lyrics')}</Label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder={t('enterLyrics')}
                  rows={12}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t('slideEditHintSimple')}
                </p>
              </div>
            )}

            {activeTab === 'style' && (
              <div className="space-y-6">
                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-muted-foreground" />
                    <Label>{t('fontSize')}</Label>
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                      {fontSize ?? defaultFontSize}px
                      {fontSize === null && ` (${t('default')})`}
                    </span>
                  </div>
                  <Slider
                    value={[fontSize ?? defaultFontSize]}
                    onValueChange={(v) => setFontSize(v[0])}
                    min={48}
                    max={144}
                    step={4}
                  />
                </div>

                {/* Position */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-muted-foreground" />
                    <Label>{t('position')}</Label>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {t(effectiveH)} · {t(effectiveV)}
                      {!hasCustomPosition && ` (${t('default')})`}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <div className="inline-grid grid-cols-3 gap-1 p-1.5 bg-muted rounded-md">
                      {positions.map(({ h, v }) => {
                        const isActive = effectiveH === h && effectiveV === v;
                        return (
                          <button
                            key={`${h}-${v}`}
                            type="button"
                            aria-label={`${v}-${h}`}
                            onClick={() => {
                              setHorizontalAlign(h);
                              setVerticalAlign(v);
                            }}
                            className={cn(
                              'w-10 h-6 rounded-sm transition-colors',
                              isActive
                                ? 'bg-primary'
                                : 'bg-background hover:bg-accent',
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Padding */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-muted-foreground" />
                    <Label>{t('padding')}</Label>
                  </div>
                  <div className="relative aspect-video bg-muted rounded-md">
                    <div
                      className="absolute bg-primary/20 rounded-sm"
                      style={{
                        top: `${effectivePadding.top}%`,
                        right: `${effectivePadding.right}%`,
                        bottom: `${effectivePadding.bottom}%`,
                        left: `${effectivePadding.left}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: t('top'),
                        value: paddingTop,
                        set: setPaddingTop,
                        def: 5,
                      },
                      {
                        label: t('bottom'),
                        value: paddingBottom,
                        set: setPaddingBottom,
                        def: 5,
                      },
                      {
                        label: t('left'),
                        value: paddingLeft,
                        set: setPaddingLeft,
                        def: 5,
                      },
                      {
                        label: t('right'),
                        value: paddingRight,
                        set: setPaddingRight,
                        def: 5,
                      },
                    ].map(({ label, value, set, def }) => (
                      <div key={label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="tabular-nums">{value ?? def}%</span>
                        </div>
                        <Slider
                          value={[value ?? def]}
                          onValueChange={(v) => set(v[0])}
                          min={0}
                          max={40}
                          step={1}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 h-14 px-4 border-t border-border">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
