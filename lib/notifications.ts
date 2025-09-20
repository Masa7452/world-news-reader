/**
 * 通知ヘルパー
 * Slack、メールなどへの通知機能を提供
 */

export interface NotificationPayload {
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp?: Date;
}

export interface PipelineMetrics {
  fetchedArticles: number;
  selectedTopics: number;
  generatedDrafts: number;
  publishedArticles: number;
  errors: string[];
  duration: number;
}

/**
 * Slack通知を送信
 */
export const sendSlackNotification = async (
  payload: NotificationPayload
): Promise<void> => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ SLACK_WEBHOOK_URL is not configured');
    return;
  }

  const emoji = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[payload.level];

  const slackMessage = {
    text: `${emoji} ${payload.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: payload.title
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message
        }
      }
    ]
  };

  if (payload.details) {
    const detailsText = Object.entries(payload.details)
      .map(([key, value]) => `• *${key}*: ${value}`)
      .join('\n');
    
    slackMessage.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: detailsText
      }
    });
  }

  if (payload.timestamp) {
    (slackMessage.blocks as any[]).push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_${payload.timestamp.toISOString()}_`
        }
      ]
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      console.error(`Failed to send Slack notification: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
};

/**
 * パイプライン完了通知
 */
export const notifyPipelineComplete = async (
  metrics: PipelineMetrics
): Promise<void> => {
  const status = metrics.errors.length > 0 ? 'warning' : 'success';
  const title = status === 'success' 
    ? 'News Pipeline Completed Successfully' 
    : 'News Pipeline Completed with Warnings';

  await sendSlackNotification({
    level: status,
    title,
    message: 'パイプライン処理が完了しました',
    details: {
      '取得記事数': metrics.fetchedArticles,
      '選定トピック数': metrics.selectedTopics,
      '生成ドラフト数': metrics.generatedDrafts,
      '公開記事数': metrics.publishedArticles,
      '処理時間': `${Math.round(metrics.duration / 1000)}秒`,
      ...(metrics.errors.length > 0 && { 'エラー': metrics.errors.join(', ') })
    },
    timestamp: new Date()
  });
};

/**
 * パイプラインエラー通知
 */
export const notifyPipelineError = async (
  error: Error,
  step?: string
): Promise<void> => {
  await sendSlackNotification({
    level: 'error',
    title: 'News Pipeline Failed',
    message: `パイプライン処理中にエラーが発生しました${step ? ` (${step})` : ''}`,
    details: {
      'エラー': error.message,
      'スタックトレース': error.stack?.split('\n').slice(0, 5).join('\n')
    },
    timestamp: new Date()
  });
};

/**
 * レート制限警告通知
 */
export const notifyRateLimitWarning = async (
  provider: string,
  remaining: number,
  limit: number
): Promise<void> => {
  const percentage = (remaining / limit) * 100;
  
  if (percentage <= 10) {
    await sendSlackNotification({
      level: 'warning',
      title: 'API Rate Limit Warning',
      message: `${provider} APIの利用制限が残り少なくなっています`,
      details: {
        'プロバイダー': provider,
        '残り回数': remaining,
        '制限値': limit,
        '残り割合': `${percentage.toFixed(1)}%`
      },
      timestamp: new Date()
    });
  }
};

/**
 * ログメッセージをコンソールとSlackに送信
 */
export const logWithNotification = async (
  level: 'info' | 'success' | 'warning' | 'error',
  message: string,
  sendToSlack = false
): Promise<void> => {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[level];

  console.log(`${prefix} ${message}`);

  if (sendToSlack && process.env.SLACK_WEBHOOK_URL) {
    await sendSlackNotification({
      level,
      title: message,
      message: '',
      timestamp: new Date()
    });
  }
};