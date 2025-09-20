"use client";

/**
 * ドラフトレビューページ
 * 生成されたドラフト記事の承認・差し戻し操作
 */

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock, Eye } from 'lucide-react';

interface DraftItem {
  filename: string;
  title: string;
  genre: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  status: string;
  issues?: {
    type: 'error' | 'warning';
    message: string;
  }[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    DRAFTED: { label: '下書き完了', variant: 'secondary' as const, icon: Clock },
    VERIFIED: { label: '検証済み', variant: 'default' as const, icon: CheckCircle },
    PUBLISHED: { label: '公開済み', variant: 'outline' as const, icon: Eye },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFTED;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default function DraftsReviewPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);

  useEffect(() => {
    // TODO: 実際のAPI呼び出しに置き換え
    // モックデータで表示テスト
    const mockDrafts: DraftItem[] = [
      {
        filename: 'global-climate-summit-2025',
        title: '世界気候サミット2025：持続可能な未来への新たな一歩',
        genre: 'science',
        publishedAt: '2025-01-15T09:00:00Z',
        sourceName: 'CNN',
        sourceUrl: 'https://www.cnn.com/2025/01/15/world/climate-summit-2025/index.html',
        status: 'VERIFIED',
        issues: []
      },
      {
        filename: 'ai-healthcare-revolution',
        title: 'AIが変える医療の未来：診断精度の飛躍的向上と倫理的課題',
        genre: 'technology',
        publishedAt: '2025-01-14T14:30:00Z',
        sourceName: 'BBC',
        sourceUrl: 'https://www.bbc.com/news/technology-ai-healthcare',
        status: 'DRAFTED',
        issues: [
          { type: 'warning', message: '数値の根拠が曖昧' }
        ]
      }
    ];

    setDrafts(mockDrafts);
    setLoading(false);
  }, []);

  const handleApprove = async (filename: string) => {
    // TODO: 承認API呼び出し
    console.log('承認:', filename);
    setDrafts(prev => prev.map(draft => 
      draft.filename === filename 
        ? { ...draft, status: 'VERIFIED' }
        : draft
    ));
  };

  const handleReject = async (filename: string) => {
    // TODO: 差し戻しAPI呼び出し
    console.log('差し戻し:', filename);
    setDrafts(prev => prev.map(draft => 
      draft.filename === filename 
        ? { ...draft, status: 'DRAFTED' }
        : draft
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Header />
        <main className="container py-8">
          <div className="text-center">読み込み中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ドラフトレビュー</h1>
          <p className="text-muted-foreground">
            AI生成された記事ドラフトのレビューと承認を行います
          </p>
        </div>

        <div className="grid gap-6">
          {drafts.map((draft) => (
            <Card key={draft.filename} className="p-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{draft.title}</CardTitle>
                    {getStatusBadge(draft.status)}
                  </div>
                  <Badge variant="outline">{draft.genre}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 出典情報 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <span>出典: </span>
                  <a
                    href={draft.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {draft.sourceName}
                  </a>
                  <span>•</span>
                  <span>{formatDate(draft.publishedAt)}</span>
                </div>

                {/* 検証結果 */}
                {draft.issues && draft.issues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      検証結果
                    </h4>
                    {draft.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded border-l-4 ${
                          issue.type === 'error' 
                            ? 'bg-red-50 border-red-400 text-red-700' 
                            : 'bg-orange-50 border-orange-400 text-orange-700'
                        }`}
                      >
                        {issue.message}
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* アクション */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDraft(draft.filename)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    プレビュー
                  </Button>
                  
                  {draft.status === 'DRAFTED' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(draft.filename)}
                        disabled={draft.issues?.some(issue => issue.type === 'error')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        承認
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(draft.filename)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        差し戻し
                      </Button>
                    </>
                  )}
                  
                  {draft.status === 'VERIFIED' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => console.log('公開:', draft.filename)}
                    >
                      📚 公開
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {drafts.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              現在レビュー待ちのドラフトはありません
            </p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}