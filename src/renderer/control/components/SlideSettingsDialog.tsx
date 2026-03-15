import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Type, Move, Maximize } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';
import { Slide, SlideOverrides } from '../../shared/types/song';
import { mergeProjectionSettings } from '../../../shared/types';
import ProjectionRenderer from '../../projection/components/ProjectionRenderer';
import {
  useProjection,
  useMedia,
  useAdvertisement,
  useFrame,
  usePresentation,
} from '../context';
import { useProjectionDimensions } from '../hooks/useProjectionDimensions';

interface SlideSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slide: Slide | null;
  defaultFontSize: number;
  onSave: (
    lines: string[],
    section?: string,
    overrides?: SlideOverrides,
    lineRoles?: ('body' | 'reference')[],
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

  const [bodyText, setBodyText] = useState('');
  const [referenceText, setReferenceText] = useState('');
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
  const [referenceFontSize, setReferenceFontSize] = useState<number | null>(
    null,
  );
  const [referenceTextColor, setReferenceTextColor] = useState<string | null>(
    null,
  );

  // Context for live preview
  const { width: PROJECTION_WIDTH, height: PROJECTION_HEIGHT } =
    useProjectionDimensions();
  const { projectionSettings, contentTypeTextSettings } = useProjection();
  const {
    fontFamily,
    currentVideoPath,
    backgroundType,
    currentImagePath,
    backgroundColor,
  } = useMedia();
  const { displaySettings: adDisplaySettings } = useAdvertisement();
  const { getFrameForType } = useFrame();
  const { currentItem } = usePresentation();

  // Preview scaling
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.2);

  useLayoutEffect(() => {
    if (!open) return;
    const el = previewRef.current;
    if (!el) return;

    const calc = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setPreviewScale(Math.min(w / PROJECTION_WIDTH, h / PROJECTION_HEIGHT));
    };

    // Delay to let dialog render
    const timer = setTimeout(calc, 50);
    const observer = new ResizeObserver(calc);
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [open, PROJECTION_WIDTH, PROJECTION_HEIGHT]);

  useEffect(() => {
    if (open && slide) {
      setActiveTab('content');
      // Split lines by role
      if (slide.lineRoles) {
        const body: string[] = [];
        const ref: string[] = [];
        slide.lines.forEach((line, i) => {
          if (slide.lineRoles![i] === 'reference') {
            ref.push(line);
          } else {
            body.push(line);
          }
        });
        setBodyText(body.join('\n'));
        setReferenceText(ref.join('\n'));
      } else {
        setBodyText(slide.lines.join('\n'));
        setReferenceText('');
      }
      setFontSize(slide.overrides?.fontSize ?? slide.fontSize ?? null);
      setHorizontalAlign(slide.overrides?.textAlign?.horizontal ?? null);
      setVerticalAlign(slide.overrides?.textAlign?.vertical ?? null);
      setPaddingTop(slide.overrides?.padding?.top ?? null);
      setPaddingBottom(slide.overrides?.padding?.bottom ?? null);
      setPaddingLeft(slide.overrides?.padding?.left ?? null);
      setPaddingRight(slide.overrides?.padding?.right ?? null);
      setReferenceFontSize(slide.overrides?.referenceFontSize ?? null);
      setReferenceTextColor(slide.overrides?.referenceTextColor ?? null);
    }
  }, [open, slide]);

  // Merge projection settings
  const settings = useMemo(
    () => mergeProjectionSettings(projectionSettings),
    [projectionSettings],
  );

  // Build preview overrides from current form state
  const previewOverrides = useMemo((): SlideOverrides | undefined => {
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
    if (referenceFontSize !== null)
      overrides.referenceFontSize = referenceFontSize;
    if (referenceTextColor !== null)
      overrides.referenceTextColor = referenceTextColor;
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }, [
    fontSize,
    horizontalAlign,
    verticalAlign,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    referenceFontSize,
    referenceTextColor,
  ]);

  // Preview lines from current edit text
  const bodyLines = useMemo(
    () =>
      bodyText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== ''),
    [bodyText],
  );
  const refLines = useMemo(
    () =>
      referenceText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== ''),
    [referenceText],
  );
  const previewLines = useMemo(
    () => [...bodyLines, ...refLines],
    [bodyLines, refLines],
  );
  const previewLineRoles = useMemo(
    (): ('body' | 'reference')[] | undefined =>
      refLines.length > 0
        ? [
            ...bodyLines.map(() => 'body' as const),
            ...refLines.map(() => 'reference' as const),
          ]
        : slide?.lineRoles,
    [bodyLines, refLines, slide?.lineRoles],
  );

  const formattedFontFamily =
    fontFamily && fontFamily !== 'inherit' ? `"${fontFamily}"` : 'inherit';

  const currentFrame = useMemo(() => {
    if (!currentItem) return null;
    return getFrameForType(currentItem.type);
  }, [currentItem, getFrameForType]);

  const handleSave = () => {
    const body = bodyText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
    const ref = referenceText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
    const lines = [...body, ...ref];
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
    if (referenceFontSize !== null)
      overrides.referenceFontSize = referenceFontSize;
    if (referenceTextColor !== null)
      overrides.referenceTextColor = referenceTextColor;
    const hasOverrides = Object.keys(overrides).length > 0;
    // Build lineRoles if there are reference lines
    const lineRoles: ('body' | 'reference')[] | undefined =
      ref.length > 0
        ? [
            ...body.map(() => 'body' as const),
            ...ref.map(() => 'reference' as const),
          ]
        : slide?.lineRoles;
    onSave(
      lines,
      slide?.section,
      hasOverrides ? overrides : undefined,
      lineRoles,
    );
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
    setReferenceFontSize(null);
    setReferenceTextColor(null);
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

  const hasReferenceLines = slide?.lineRoles?.includes('reference') ?? false;

  // Default reference values from content-type settings
  const defaultRefFontSize =
    contentTypeTextSettings?.bible?.referenceStyle?.fontSize ?? 48;
  const defaultRefColor =
    contentTypeTextSettings?.bible?.referenceStyle?.textColor ?? '#cccccc';

  const hasAnyOverride =
    fontSize !== null ||
    hasCustomPosition ||
    paddingTop !== null ||
    paddingBottom !== null ||
    paddingLeft !== null ||
    paddingRight !== null ||
    referenceFontSize !== null ||
    referenceTextColor !== null;

  const tabs = [
    { id: 'content' as Tab, label: t('content') },
    { id: 'style' as Tab, label: t('style') },
  ];

  const scaledDimensions = {
    width: PROJECTION_WIDTH * previewScale,
    height: PROJECTION_HEIGHT * previewScale,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('slideSettings')}</DialogTitle>

        <div className="flex h-[520px]">
          {/* Left: Controls */}
          <div className="w-[420px] flex flex-col flex-shrink-0 border-r border-border">
            {/* Header with tabs */}
            <div className="flex items-center justify-between h-11 px-4 border-b border-border flex-shrink-0">
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
                <div className="space-y-4">
                  {/* Body text */}
                  <div className="space-y-2">
                    <Label>
                      {hasReferenceLines
                        ? t('verseText')
                        : currentItem?.type === 'announcement'
                          ? t('content')
                          : t('lyrics')}
                    </Label>
                    <Textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder={t('enterLyrics')}
                      rows={
                        hasReferenceLines ||
                        currentItem?.type === 'announcement'
                          ? 8
                          : 12
                      }
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('slideEditHintSimple')}
                    </p>
                  </div>

                  {/* Reference / Note — for Bible and Announcement */}
                  {(hasReferenceLines ||
                    currentItem?.type === 'announcement') && (
                    <div className="space-y-2">
                      <Label>
                        {hasReferenceLines ? t('referenceText') : t('noteText')}
                      </Label>
                      <Textarea
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'style' && (
                <div className="space-y-6">
                  {/* Font Size — show as "Verse" when Bible slide */}
                  <div className="space-y-3">
                    {hasReferenceLines && (
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('verseText')}
                      </Label>
                    )}
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <Label>
                        {hasReferenceLines ? t('verseFontSize') : t('fontSize')}
                      </Label>
                      <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                        {fontSize ?? defaultFontSize}px
                        {fontSize === null && ` (${t('default')})`}
                      </span>
                    </div>
                    <Slider
                      value={[fontSize ?? defaultFontSize]}
                      onValueChange={(v) => setFontSize(v[0])}
                      min={48}
                      max={360}
                      step={4}
                    />
                  </div>

                  {/* Reference controls — only for Bible slides */}
                  {hasReferenceLines && (
                    <div className="space-y-3">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('referenceText')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-muted-foreground" />
                        <Label>{t('referenceFontSize')}</Label>
                        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                          {referenceFontSize ?? defaultRefFontSize}px
                          {referenceFontSize === null && ` (${t('default')})`}
                        </span>
                      </div>
                      <Slider
                        value={[referenceFontSize ?? defaultRefFontSize]}
                        onValueChange={(v) => setReferenceFontSize(v[0])}
                        min={24}
                        max={280}
                        step={4}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Label>{t('referenceTextColor')}</Label>
                        <input
                          type="color"
                          value={referenceTextColor ?? defaultRefColor}
                          onChange={(e) =>
                            setReferenceTextColor(e.target.value)
                          }
                          className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent p-0.5 ml-auto"
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {referenceTextColor ?? defaultRefColor}
                        </span>
                      </div>
                    </div>
                  )}

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
                            <span className="text-muted-foreground">
                              {label}
                            </span>
                            <span className="tabular-nums">
                              {value ?? def}%
                            </span>
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
            <div className="flex items-center justify-end gap-2 h-14 px-4 border-t border-border flex-shrink-0">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave}>{t('save')}</Button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-11 px-4 flex items-center border-b border-border flex-shrink-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('livePreview')}
              </span>
            </div>
            <div
              ref={previewRef}
              className="flex-1 min-h-0 flex items-center justify-center bg-black"
            >
              <div
                className="relative overflow-hidden"
                style={{
                  width: scaledDimensions.width,
                  height: scaledDimensions.height,
                }}
              >
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    width: PROJECTION_WIDTH,
                    height: PROJECTION_HEIGHT,
                  }}
                >
                  <div className="relative w-full h-full overflow-hidden bg-black">
                    <ProjectionRenderer
                      videoPath={currentVideoPath}
                      imagePath={currentImagePath}
                      backgroundColor={backgroundColor}
                      backgroundType={backgroundType}
                      lines={previewLines}
                      fontFamily={formattedFontFamily}
                      settings={settings}
                      slideFontSize={fontSize ?? slide?.fontSize ?? undefined}
                      slideOverrides={previewOverrides}
                      isBlank={false}
                      isVerseHidden={false}
                      isAdVisible={false}
                      currentAd={null}
                      adDisplaySettings={adDisplaySettings}
                      frame={currentFrame}
                      contentType={currentItem?.type}
                      lineRoles={previewLineRoles}
                      contentTypeTextSettings={
                        contentTypeTextSettings ?? undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
