import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Separator } from '../../../../components/ui/separator';
import { cn } from '../../../../lib/utils';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

type ApiKeyStatus = 'idle' | 'loading' | 'valid' | 'invalid' | 'not-set';

interface ApiSettingsTabProps {
  isOpen: boolean;
}

export function ApiSettingsTab({ isOpen }: ApiSettingsTabProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('not-set');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Load initial settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const electron = getElectron();
    if (!electron) return;

    try {
      const hasKey = await electron.settings.hasApiKey();
      setApiKeyStatus(hasKey ? 'valid' : 'not-set');
      if (hasKey) {
        setApiKey('••••••••••••••••••••••••');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleApiKeyChange = (value: string) => {
    if (apiKey === '••••••••••••••••••••••••') {
      setApiKey(value.slice(-1));
    } else {
      setApiKey(value);
    }
    setApiKeyStatus('idle');
    setApiKeyError(null);
  };

  const handleTestApiKey = async () => {
    console.log('[ApiSettingsTab] handleTestApiKey called', {
      apiKey: apiKey ? '***' : 'empty',
    });

    if (!apiKey || apiKey === '••••••••••••••••••••••••') {
      setApiKeyError('Please enter an API key');
      return;
    }

    const electron = getElectron();
    console.log(
      '[ApiSettingsTab] electron:',
      electron ? 'available' : 'undefined',
    );
    if (!electron) {
      console.error('[ApiSettingsTab] electron is not available!');
      setApiKeyError('Electron API not available');
      return;
    }

    setApiKeyStatus('loading');
    setApiKeyError(null);

    try {
      console.log('[ApiSettingsTab] Calling testApiKey...');
      const result = await electron.settings.testApiKey(apiKey);
      console.log('[ApiSettingsTab] testApiKey result:', result);
      if (result.success) {
        console.log('[ApiSettingsTab] Calling setApiKey...');
        await electron.settings.setApiKey(apiKey);
        setApiKeyStatus('valid');
        setApiKey('••••••••••••••••••••••••');
      } else {
        setApiKeyStatus('invalid');
        setApiKeyError(result.error || 'Invalid API key');
      }
    } catch (error) {
      console.error('[ApiSettingsTab] Error:', error);
      setApiKeyStatus('invalid');
      setApiKeyError('Connection failed');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h4 className="text-[13px] font-medium text-foreground mb-0.5">
          {t('openaiApiKey')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t('apiKeyDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="api-key"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          {t('apiKeyLabel')}
        </Label>
        <div className="relative">
          <Input
            id="api-key"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="sk-..."
            className={cn(
              'pr-10 font-mono text-sm bg-muted/30 border-border',
              'focus:border-foreground focus:ring-1 focus:ring-foreground',
              apiKeyStatus === 'invalid' &&
                'border-red-500 focus:border-red-500 focus:ring-red-500',
            )}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {apiKeyStatus !== 'idle' && apiKeyStatus !== 'loading' && (
          <div
            className={cn(
              'flex items-center gap-2 text-xs',
              apiKeyStatus === 'valid' && 'text-foreground',
              apiKeyStatus === 'invalid' && 'text-red-500',
              apiKeyStatus === 'not-set' && 'text-muted-foreground',
            )}
          >
            {apiKeyStatus === 'valid' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('apiKeyValid')}
              </>
            )}
            {apiKeyStatus === 'invalid' && (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                {apiKeyError || t('apiKeyInvalid')}
              </>
            )}
            {apiKeyStatus === 'not-set' && (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                {t('apiKeyNotSet')}
              </>
            )}
          </div>
        )}

        <Button
          type="button"
          onClick={() => {
            console.log('[ApiSettingsTab] Button clicked!');
            handleTestApiKey();
          }}
          disabled={
            apiKeyStatus === 'loading' ||
            !apiKey ||
            apiKey === '••••••••••••••••••••••••'
          }
          variant="outline"
          className="w-full border-border hover:bg-muted/50"
        >
          {apiKeyStatus === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('testing')}
            </>
          ) : (
            t('testAndSave')
          )}
        </Button>
      </div>

      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      <p className="text-xs text-muted-foreground">
        {t('getApiKeyFrom')}{' '}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline inline-flex items-center gap-1"
        >
          {t('openaiPlatform')}
          <ExternalLink className="w-3 h-3" />
        </a>
        . {t('storedSecurely')}
      </p>
    </div>
  );
}
