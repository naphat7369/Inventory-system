'use client';

import { useEffect, useRef, useState } from 'react';

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
};

type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void> };
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

function PdfPages({ url, fileName }: { url: string; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let document: PdfDocument | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;
    let renderVersion = 0;
    let lastWidth = 0;

    async function renderPages() {
      const container = containerRef.current;
      if (!container || !document || cancelled) return;
      const availableWidth = Math.floor(container.clientWidth);
      if (availableWidth < 1 || availableWidth === lastWidth) return;
      lastWidth = availableWidth;
      const currentVersion = ++renderVersion;
      const fragment = window.document.createDocumentFragment();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const originalViewport = page.getViewport({ scale: 1 });
        const cssScale = availableWidth / originalViewport.width;
        const renderViewport = page.getViewport({ scale: cssScale * pixelRatio });
        const canvas = window.document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas is unavailable');
        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        canvas.style.width = `${availableWidth}px`;
        canvas.style.height = `${Math.ceil(originalViewport.height * cssScale)}px`;
        canvas.className = 'block h-auto max-w-full bg-white shadow-sm';
        canvas.setAttribute('aria-label', `${fileName} หน้า ${pageNumber}`);
        await page.render({ canvas, canvasContext: context, viewport: renderViewport }).promise;
        if (cancelled || currentVersion !== renderVersion) return;
        fragment.appendChild(canvas);
      }

      if (!cancelled && currentVersion === renderVersion) {
        container.replaceChildren(fragment);
        setStatus('ready');
      }
    }

    async function loadDocument() {
      try {
        const [response, pdfjs] = await Promise.all([
          fetch(url, { credentials: 'same-origin' }),
          import('pdfjs-dist/build/pdf.mjs'),
        ]);
        if (!response.ok) throw new Error('Cannot load PDF');
        pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
        const bytes = new Uint8Array(await response.arrayBuffer());
        document = await pdfjs.getDocument({ data: bytes }).promise as PdfDocument;
        if (cancelled) return;
        await renderPages();
        resizeObserver = new ResizeObserver(() => {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = window.requestAnimationFrame(() => void renderPages());
        });
        if (containerRef.current) resizeObserver.observe(containerRef.current);
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
      renderVersion += 1;
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      void document?.destroy();
    };
  }, [fileName, url]);

  return (
    <div className="relative w-full">
      {status === 'loading' && <div className="grid min-h-48 place-items-center bg-white text-sm text-slate-500">กำลังแสดง PDF…</div>}
      {status === 'error' && <div className="grid min-h-48 place-items-center bg-white p-6 text-center text-sm text-rose-600">ไม่สามารถแสดง PDF นี้ได้</div>}
      <div ref={containerRef} className={`w-full space-y-4 ${status !== 'ready' ? 'absolute inset-x-0 top-0 invisible' : ''}`} />
    </div>
  );
}

function OfficeDocument({ url, fileName }: { url: string; fileName: string }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setHtml('');
    setError(false);
    fetch(url, { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { html?: string };
        if (!response.ok || !body.html) throw new Error('Cannot preview office document');
        setHtml(body.html);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [url]);

  if (error) return <div className="grid min-h-48 place-items-center bg-white p-6 text-center text-sm text-rose-600">ไม่สามารถแสดงไฟล์ {fileName} ได้</div>;
  if (!html) return <div className="grid min-h-48 place-items-center bg-white text-sm text-slate-500">กำลังแสดงเอกสาร…</div>;

  return <div className="attachment-office-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AttachmentDocumentPreview({ memoId, attachments }: { memoId: string; attachments: Attachment[] }) {
  return (
    <section className="mb-6 space-y-6 print:hidden">
      {attachments.map((attachment) => {
        const baseUrl = `/api/memos/${memoId}/attachments/${attachment.id}`;
        const extension = attachment.fileName.split('.').pop()?.toLowerCase() ?? '';
        const isPdf = attachment.mimeType === 'application/pdf' || extension === 'pdf';
        const isImage = attachment.mimeType.startsWith('image/');
        const isOffice = ['doc', 'docx', 'xls', 'xlsx'].includes(extension);

        return (
          <div key={attachment.id} className="w-full min-w-0 bg-white dark:bg-slate-950">
            {isPdf && <PdfPages url={`${baseUrl}?view=1`} fileName={attachment.fileName} />}
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${baseUrl}?view=1`} alt={attachment.fileName} loading="lazy" className="block h-auto w-full bg-white object-contain" />
            )}
            {isOffice && <OfficeDocument url={`${baseUrl}?preview=html`} fileName={attachment.fileName} />}
            {!isPdf && !isImage && !isOffice && (
              <div className="grid min-h-48 place-items-center bg-white p-6 text-center text-sm text-slate-600">ไฟล์ประเภทนี้ยังไม่รองรับการแสดงตัวอย่าง</div>
            )}
          </div>
        );
      })}
      <style jsx global>{`
        .attachment-office-preview {
          width: 100%;
          color: #0f172a;
          overflow: visible;
          overflow-wrap: anywhere;
        }
        .attachment-office-preview .word-document,
        .attachment-office-preview .word-page,
        .attachment-office-preview .excel-sheet {
          width: 100%;
          min-width: 0;
          background: #fff;
          overflow: visible;
        }
        .attachment-office-preview .word-document,
        .attachment-office-preview .word-page {
          aspect-ratio: 210 / 297;
          padding: clamp(1rem, 5vw, 20mm);
        }
        .attachment-office-preview .legacy-word-document {
          min-height: 0;
          padding: 0;
          aspect-ratio: auto;
          background: transparent;
        }
        .attachment-office-preview .legacy-word-document .word-page {
          width: 100%;
          background: #fff;
        }
        .attachment-office-preview .word-page + .word-page {
          margin-top: 1rem;
        }
        .attachment-office-preview .excel-sheet {
          padding: clamp(0.75rem, 3vw, 1.5rem);
          margin-bottom: 1rem;
        }
        .attachment-office-preview h2 {
          margin: 0 0 1rem;
          font-size: 1rem;
          font-weight: 700;
        }
        .attachment-office-preview img {
          max-width: 100%;
          height: auto;
        }
        .attachment-office-preview table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: clamp(0.625rem, 2vw, 0.875rem);
        }
        .attachment-office-preview td,
        .attachment-office-preview th {
          border: 1px solid #cbd5e1;
          padding: 0.35rem;
          vertical-align: top;
          white-space: normal;
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  );
}
