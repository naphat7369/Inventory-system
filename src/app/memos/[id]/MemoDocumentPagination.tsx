"use client";

import React, { useState, useEffect, useRef } from 'react';

// ========================================================
// TYPES & CONTENT BLOCK DEFINITION
// ========================================================
export type MemoContentBlock =
  | { type: "paragraph"; html: string }
  | { type: "heading"; html: string }
  | { type: "list"; html: string }
  | { type: "table"; html: string }
  | { type: "image"; html: string };

export type MemoSignatureItem = {
  id?: string;
  role: string;
  name?: string | null;
  position?: string | null;
  sortOrder?: number;
};

export type MemoDocumentPaginationProps = {
  memo: {
    id: string;
    documentNo?: string | null;
    subject: string;
    content: string;
    recipient: string;
    sender: string;
    reference?: string | null;
    carbonCopy?: string | null;
    documentDate: Date | string;
    status: string;
    logoUrl?: string | null;
    subHeader?: string | null;
    remark?: string | null;
  };
  thaiDateStr: string;
  displayLogoUrl: string;
  displaySubHeader: string;
  signatures: MemoSignatureItem[];
};

type PageData = {
  pageNumber: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  blocks: MemoContentBlock[];
  hasFinalBlock: boolean;
};

// ========================================================
// HTML SANITIZER
// ========================================================
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove dangerous executable or linking tags
  const blockedTags = ['script', 'iframe', 'object', 'embed', 'form', 'link', 'style', 'meta', 'base'];
  blockedTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  // Remove event handlers and javascript: URIs
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.toLowerCase();
      if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

// ========================================================
// BLOCK PARSER
// ========================================================
export function parseHtmlToBlocks(rawHtml: string): MemoContentBlock[] {
  if (typeof window === 'undefined') {
    return [{ type: 'paragraph', html: rawHtml }];
  }

  const cleanHtml = sanitizeHtml(rawHtml);
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  const blocks: MemoContentBlock[] = [];

  const children = Array.from(doc.body.children);
  if (children.length === 0) {
    if (cleanHtml.trim()) {
      blocks.push({ type: 'paragraph', html: `<p>${cleanHtml}</p>` });
    }
    return blocks;
  }

  children.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      blocks.push({ type: 'heading', html: el.outerHTML });
    } else if (tag === 'ul' || tag === 'ol') {
      blocks.push({ type: 'list', html: el.outerHTML });
    } else if (tag === 'table') {
      blocks.push({ type: 'table', html: el.outerHTML });
    } else if (tag === 'img' || (el.children.length === 1 && el.children[0].tagName.toLowerCase() === 'img')) {
      blocks.push({ type: 'image', html: el.outerHTML });
    } else {
      blocks.push({ type: 'paragraph', html: el.outerHTML });
    }
  });

  return blocks;
}

// ========================================================
// MAIN COMPONENT
// ========================================================
export function MemoDocumentPagination({
  memo,
  thaiDateStr,
  displayLogoUrl,
  displaySubHeader,
  signatures,
}: MemoDocumentPaginationProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [isPaginating, setIsPaginating] = useState<boolean>(true);

  // References for measurement
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const dummy261mmRef = useRef<HTMLDivElement>(null);
  const page1HeaderRef = useRef<HTMLDivElement>(null);
  const page2RunningHeaderRef = useRef<HTMLDivElement>(null);
  const closingTextRef = useRef<HTMLDivElement>(null);
  const signatureGroupRef = useRef<HTMLDivElement>(null);
  const footerNoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function calculatePages() {
      setIsPaginating(true);

      // 1. Wait for Local Fonts to be fully loaded
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // Continue if fonts.ready fails
        }
      }
      if (cancelled) return;

      // 2. Wait for all Images in Measurement Container
      const measureContainer = measureContainerRef.current;
      if (measureContainer) {
        const images = Array.from(measureContainer.querySelectorAll('img'));
        await Promise.all(
          images.map((img) => {
            if (img.complete) {
              return img.decode().catch(() => undefined);
            }
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          })
        );
      }
      if (cancelled) return;

      // 3. Read exact pixel heights from Measurement Container
      const a4InnerHeight = dummy261mmRef.current?.offsetHeight || 986;
      const page1HeaderHeight = page1HeaderRef.current?.offsetHeight || 230;
      const page2RunningHeight = page2RunningHeaderRef.current?.offsetHeight || 42;
      
      const closingHeight = closingTextRef.current?.offsetHeight || 44;
      const sigHeight = signatureGroupRef.current?.offsetHeight || 130;
      const remarkHeight = memo.remark ? (footerNoteRef.current?.offsetHeight || 32) : 0;
      const finalBlockGap = 32; // mt-8 spacing before signatures
      const finalBlockHeight = closingHeight + sigHeight + finalBlockGap + remarkHeight;

      // Usable capacity for content on Page 1 and Page 2+
      const page1Capacity = Math.max(100, a4InnerHeight - page1HeaderHeight - 8);
      const page2Capacity = Math.max(100, a4InnerHeight - page2RunningHeight - 8);

      // 4. Parse content into structured blocks
      const allBlocks = parseHtmlToBlocks(memo.content);

      // Helper to measure HTML string in temp container
      const measureHtml = (html: string): number => {
        if (!measureContainer) return 30;
        const tempDiv = document.createElement('div');
        tempDiv.className = 'memo-content text-[14pt] leading-[1.45] text-black';
        tempDiv.style.width = '172mm';
        tempDiv.style.boxSizing = 'border-box';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        tempDiv.innerHTML = html;
        measureContainer.appendChild(tempDiv);
        const h = tempDiv.offsetHeight;
        measureContainer.removeChild(tempDiv);
        return h;
      };

      // Measure all blocks
      const blockHeights = allBlocks.map((b) => measureHtml(b.html));
      const totalContentHeight = blockHeights.reduce((acc, val) => acc + val, 0);

      // 5. Test if everything fits on Page 1 (Single Page Check)
      const singlePageFinalHeight = closingHeight + sigHeight + finalBlockGap;
      if (totalContentHeight + singlePageFinalHeight <= page1Capacity) {
        if (!cancelled) {
          setPages([
            {
              pageNumber: 1,
              isFirstPage: true,
              isLastPage: true,
              blocks: allBlocks,
              hasFinalBlock: true,
            },
          ]);
          setIsPaginating(false);
        }
        return;
      }

      // 6. Multi-page Pagination Algorithm
      const computedPages: PageData[] = [];
      let currentPageBlocks: MemoContentBlock[] = [];
      let currentCapacity = page1Capacity;
      let currentUsedHeight = 0;
      let isFirst = true;

      const finishCurrentPage = (hasFinal: boolean = false) => {
        computedPages.push({
          pageNumber: computedPages.length + 1,
          isFirstPage: isFirst,
          isLastPage: false, // will update on last page
          blocks: [...currentPageBlocks],
          hasFinalBlock: hasFinal,
        });
        currentPageBlocks = [];
        currentUsedHeight = 0;
        isFirst = false;
        currentCapacity = page2Capacity;
      };

      // Helper: Binary Search split for long paragraph without cutting mid-word
      const splitParagraph = (
        rawPText: string,
        availableH: number
      ): { fitPart: string; overflowPart: string } => {
        const parser = new DOMParser();
        const pDoc = parser.parseFromString(rawPText, 'text/html');
        const textContent = pDoc.body.textContent || '';
        
        let words: string[] = [];
        if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
          const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
          words = Array.from(segmenter.segment(textContent)).map((s: any) => s.segment);
        } else {
          words = textContent.split(/(\s+)/).filter(Boolean);
        }

        if (words.length <= 1) {
          return { fitPart: '', overflowPart: rawPText };
        }

        let low = 1;
        let high = words.length - 1;
        let bestFit = 0;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const testSlice = words.slice(0, mid).join('');
          const testHtml = `<p>${testSlice}</p>`;
          const testH = measureHtml(testHtml);

          if (testH <= availableH) {
            bestFit = mid;
            low = mid + 1; // Try to fit more words
          } else {
            high = mid - 1;
          }
        }

        if (bestFit <= 0) {
          return { fitPart: '', overflowPart: rawPText };
        }

        const fitWords = words.slice(0, bestFit).join('');
        const overflowWords = words.slice(bestFit).join('');
        return {
          fitPart: `<p>${fitWords}</p>`,
          overflowPart: `<p>${overflowWords}</p>`,
        };
      };

      // Helper: Split List by <li> items
      const splitList = (
        listHtml: string,
        availableH: number
      ): { fitPart: string; overflowPart: string } => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(listHtml, 'text/html');
        const listEl = doc.body.children[0];
        if (!listEl) return { fitPart: '', overflowPart: listHtml };

        const tag = listEl.tagName.toLowerCase();
        const items = Array.from(listEl.querySelectorAll('li'));
        if (items.length <= 1) return { fitPart: '', overflowPart: listHtml };

        let fitCount = 0;
        for (let i = 1; i <= items.length; i++) {
          const testItems = items.slice(0, i).map((li) => li.outerHTML).join('');
          const testHtml = `<${tag}>${testItems}</${tag}>`;
          if (measureHtml(testHtml) <= availableH) {
            fitCount = i;
          } else {
            break;
          }
        }

        if (fitCount === 0) return { fitPart: '', overflowPart: listHtml };

        const fitItems = items.slice(0, fitCount).map((li) => li.outerHTML).join('');
        const overflowItems = items.slice(fitCount).map((li) => li.outerHTML).join('');
        const startAttr = tag === 'ol' ? ` start="${fitCount + 1}"` : '';

        return {
          fitPart: `<${tag}>${fitItems}</${tag}>`,
          overflowPart: `<${tag}${startAttr}>${overflowItems}</${tag}>`,
        };
      };

      // Iterate through content blocks
      let blockIndex = 0;
      let finalBlockPlaced = false;

      while (blockIndex < allBlocks.length) {
        if (cancelled) return;
        const block = allBlocks[blockIndex];
        const blockH = measureHtml(block.html);
        const remainingSpace = currentCapacity - currentUsedHeight;

        // Check if this is the final content block and if Final Block can fit with it
        if (blockIndex === allBlocks.length - 1) {
          if (currentUsedHeight + blockH + finalBlockHeight <= currentCapacity) {
            currentPageBlocks.push(block);
            currentUsedHeight += blockH;
            finishCurrentPage(true);
            finalBlockPlaced = true;
            blockIndex++;
            break;
          }
        }

        // Check if block fits completely
        if (currentUsedHeight + blockH <= currentCapacity) {
          // Orphan Heading Check: heading should not be at the bottom without following text
          if (block.type === 'heading') {
            const nextBlock = allBlocks[blockIndex + 1];
            const nextMinH = nextBlock ? 50 : 0;
            if (currentUsedHeight + blockH + nextMinH > currentCapacity) {
              // Push heading to next page
              finishCurrentPage(false);
              continue;
            }
          }

          currentPageBlocks.push(block);
          currentUsedHeight += blockH;
          blockIndex++;
        } else {
          // Block does not fit in remaining space. Can we split it?
          if (block.type === 'paragraph' && remainingSpace >= 50) {
            const { fitPart, overflowPart } = splitParagraph(block.html, remainingSpace);
            if (fitPart && overflowPart) {
              currentPageBlocks.push({ type: 'paragraph', html: fitPart });
              finishCurrentPage(false);
              allBlocks[blockIndex] = { type: 'paragraph', html: overflowPart };
              continue;
            }
          } else if (block.type === 'list' && remainingSpace >= 40) {
            const { fitPart, overflowPart } = splitList(block.html, remainingSpace);
            if (fitPart && overflowPart) {
              currentPageBlocks.push({ type: 'list', html: fitPart });
              finishCurrentPage(false);
              allBlocks[blockIndex] = { type: 'list', html: overflowPart };
              continue;
            }
          }

          // Cannot split or no room: finish page and put block on next page
          if (currentPageBlocks.length > 0) {
            finishCurrentPage(false);
          } else {
            // Block is taller than entire page capacity; place it anyway to prevent infinite loop
            currentPageBlocks.push(block);
            finishCurrentPage(false);
            blockIndex++;
          }
        }
      }

      // If all content blocks placed but Final Block is not yet placed:
      if (!finalBlockPlaced) {
        const remainingSpace = currentCapacity - currentUsedHeight;
        if (remainingSpace >= finalBlockHeight) {
          // Fits on current page
          finishCurrentPage(true);
        } else {
          // Doesn't fit: finish current page and place Final Block on dedicated final page
          if (currentPageBlocks.length > 0) {
            finishCurrentPage(false);
          }
          // Now on fresh page
          finishCurrentPage(true);
        }
      }

      // Mark the very last page
      if (computedPages.length > 0) {
        computedPages[computedPages.length - 1].isLastPage = true;
      }

      if (!cancelled) {
        setPages(computedPages);
        setIsPaginating(false);
      }
    }

    calculatePages();

    return () => {
      cancelled = true;
    };
  }, [
    memo.content,
    memo.subject,
    memo.documentNo,
    memo.recipient,
    memo.sender,
    memo.reference,
    memo.carbonCopy,
    thaiDateStr,
    displayLogoUrl,
    displaySubHeader,
    signatures,
    memo.remark,
  ]);

  const totalPages = pages.length || 1;

  return (
    <div className="memo-document-container w-full flex flex-col items-center">
      {/* Loading indicator while calculating pagination */}
      {isPaginating && (
        <div className="py-6 text-slate-500 font-medium text-sm flex items-center justify-center gap-2 print:hidden">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>กำลังจัดหน้าเอกสาร...</span>
        </div>
      )}

      {/* Accuracy Disclaimer Banner */}
      <div className="max-w-[210mm] w-full text-xs text-slate-500 mb-4 px-2 print:hidden text-center sm:text-left">
        * หน้า Preview และ PDF ใช้ Layout และ CSS ชุดเดียวกัน เพื่อให้ตำแหน่งแบ่งหน้าใกล้เคียงกันมากที่สุด โดยแนะนำให้พิมพ์ด้วยกระดาษ A4, Scale 100%, Margins None, ปิด Headers and Footers และเปิด Background graphics
      </div>

      {/* Rendered A4 Page Sheets */}
      <div className="w-full flex flex-col items-center print:block">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            className="memo-page-sheet memo-document memo-paper bg-white shadow-xl print:shadow-none flex flex-col justify-start"
            style={{
              width: '210mm',
              height: '297mm',
              maxHeight: '297mm',
              padding: '14mm 18mm 22mm 20mm',
              boxSizing: 'border-box',
              position: 'relative',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Top Section */}
            <div className="memo-content-upper flex flex-col">
              {/* Page 1 Full Header */}
              {page.isFirstPage ? (
                <>
                  <header className="memo-header">
                    <div className="memo-header-main">
                      {/* Logo */}
                      <div className="memo-logo-container">
                        <img
                          src={displayLogoUrl}
                          alt="Hotel logo"
                          className="memo-logo"
                        />
                      </div>

                      {/* Vertical Gold Divider */}
                      <div className="memo-header-divider" />

                      {/* Title & Department */}
                      <div className="memo-heading-group">
                        <h1 className="memo-title">MEMORANDUM</h1>
                        <p className="memo-department">{displaySubHeader}</p>
                      </div>

                      {/* Document Number */}
                      <div className="memo-document-number">
                        {memo.documentNo ? (
                          memo.documentNo
                        ) : (
                          <span className="text-[#c6a36b] font-semibold text-[12pt] print:hidden">DRAFT</span>
                        )}
                      </div>
                    </div>

                    {/* Horizontal Gold Rule */}
                    <div className="memo-header-rule" />
                  </header>

                  {/* Metadata Table */}
                  <table className="w-full border-collapse border border-black mb-2.5 text-[14pt] text-black">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black px-2.5 py-0.5 font-bold w-20 text-center">
                          เรียน
                        </td>
                        <td className="px-2.5 py-0.5" colSpan={3}>
                          {memo.recipient}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black px-2.5 py-0.5 font-bold text-center">
                          จาก
                        </td>
                        <td className="px-2.5 py-0.5" colSpan={3}>
                          {memo.sender}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black px-2.5 py-0.5 font-bold text-center">
                          เรื่อง
                        </td>
                        <td className="border-r border-black px-2.5 py-0.5 w-1/2 font-medium">
                          {memo.subject}
                        </td>
                        <td className="border-r border-black px-2.5 py-0.5 font-bold w-20 text-center">
                          อ้างถึง
                        </td>
                        <td className="px-2.5 py-0.5">
                          {memo.reference || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-black px-2.5 py-0.5 font-bold text-center">
                          วันที่
                        </td>
                        <td className="border-r border-black px-2.5 py-0.5">
                          {thaiDateStr}
                        </td>
                        <td className="border-r border-black px-2.5 py-0.5 font-bold text-center">
                          สำเนา
                        </td>
                        <td className="px-2.5 py-0.5">
                          {memo.carbonCopy || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Subject Line */}
                  <div className="font-bold text-[14.5pt] text-black mb-1.5">
                    เรื่อง {memo.subject}
                  </div>
                </>
              ) : (
                /* Page 2+ Minimal Running Header */
                <div className="memo-running-header flex justify-between items-center border-b border-[#c6a36b] pb-1.5 mb-3 text-[12pt] text-slate-700">
                  <div className="font-semibold text-black tracking-wide">
                    {displaySubHeader}
                  </div>
                  <div className="font-medium text-black">
                    {memo.documentNo || 'DRAFT'} | หน้า {page.pageNumber} / {totalPages}
                  </div>
                </div>
              )}

              {/* Content Blocks for this Page */}
              <div className="memo-content-page-blocks text-[14pt] leading-[1.45] text-black">
                {page.blocks.map((b, idx) => (
                  <div
                    key={idx}
                    className="memo-content-block mb-2"
                    dangerouslySetInnerHTML={{ __html: b.html }}
                  />
                ))}
              </div>

              {/* Closing Remark (If final block is on this page) */}
              {page.hasFinalBlock && (
                <div className="memo-closing-block mt-6 mb-3 text-[14pt] font-bold text-black indent-[1.5cm]">
                  จึงเรียนมาเพื่อโปรดพิจารณา และอนุมัติตามข้อมูลข้างต้น
                </div>
              )}
            </div>

            {/* Final Block: Signatures Section */}
            {page.hasFinalBlock && (
              <div className="memo-signature-group mt-8 mb-2 pt-1 pb-1">
                {renderSignatures(signatures)}
              </div>
            )}

            {/* Final Block: Footer Note / หมายเหตุกั้นท้าย (ตรึงขอบล่างเสมอ) */}
            {page.hasFinalBlock && memo.remark && (
              <div className="memo-footer-note mt-auto pt-3 border-t border-slate-300/80 text-[13pt] leading-normal text-black whitespace-pre-wrap">
                <span className="font-bold">หมายเหตุ: </span>
                <span>{memo.remark}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ========================================================
          OFF-SCREEN MEASUREMENT CONTAINER (EXACT SAME CSS AS REAL PAGE)
         ======================================================== */}
      <div
        ref={measureContainerRef}
        className="memo-measurement-container"
        style={{
          position: 'absolute',
          top: 0,
          left: '-99999px',
          width: '210mm',
          padding: '14mm 18mm 22mm 20mm',
          boxSizing: 'border-box',
          visibility: 'hidden',
          pointerEvents: 'none',
          fontFamily: "'Angsana New', 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif",
          color: '#000000',
        }}
      >
        {/* 261mm Height Calibration Dummy (297mm - 14mm top - 22mm bottom) */}
        <div ref={dummy261mmRef} style={{ height: '261mm', width: '1px' }} />

        {/* Page 1 Header Measurement */}
        <div ref={page1HeaderRef}>
          <header className="memo-header">
            <div className="memo-header-main" style={{ minHeight: '24mm', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '35mm', minWidth: '35mm', height: '23mm' }}>
                <img src={displayLogoUrl} alt="Logo" style={{ maxHeight: '23mm', width: '100%' }} />
              </div>
              <div style={{ width: '1px', height: '20mm', background: '#c6a36b', margin: '0 5mm' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '17pt', fontWeight: 700 }}>MEMORANDUM</div>
                <div style={{ fontSize: '11pt', fontWeight: 700 }}>{displaySubHeader}</div>
              </div>
              <div style={{ fontSize: '14pt', fontWeight: 700 }}>{memo.documentNo || 'DRAFT'}</div>
            </div>
            <div style={{ width: '100%', height: '1px', background: '#c6a36b', marginTop: '2.5mm' }} />
          </header>
          <table className="w-full border border-black mb-2.5 text-[14pt]">
            <tbody>
              <tr><td className="p-1">Dummy Row 1</td></tr>
              <tr><td className="p-1">Dummy Row 2</td></tr>
              <tr><td className="p-1">Dummy Row 3</td></tr>
              <tr><td className="p-1">Dummy Row 4</td></tr>
            </tbody>
          </table>
          <div className="font-bold text-[14.5pt] mb-1.5">เรื่อง {memo.subject}</div>
        </div>

        {/* Page 2 Running Header Measurement */}
        <div ref={page2RunningHeaderRef} className="flex justify-between items-center border-b border-[#c6a36b] pb-1.5 mb-3 text-[12pt]">
          <span>{displaySubHeader}</span>
          <span>{memo.documentNo || 'DRAFT'} | หน้า 2 / 2</span>
        </div>

        {/* Closing Text Measurement */}
        <div ref={closingTextRef} className="memo-closing-block mt-6 mb-3 text-[14pt] font-bold text-black indent-[1.5cm]">
          จึงเรียนมาเพื่อโปรดพิจารณา และอนุมัติตามข้อมูลข้างต้น
        </div>

        {/* Signature Group Measurement */}
        <div ref={signatureGroupRef} className="memo-signature-group">
          {renderSignatures(signatures)}
        </div>

        {/* Footer Note Measurement */}
        {memo.remark && (
          <div ref={footerNoteRef} className="memo-footer-note mt-6 text-[13pt] leading-normal text-black whitespace-pre-wrap">
            <span className="font-bold">หมายเหตุ: </span>
            <span>{memo.remark}</span>
          </div>
        )}
      </div>

      {/* ========================================================
          GLOBAL PRINT & PAGINATION STYLES
         ======================================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

        .memo-paper {
          font-family: 'Angsana New', 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif;
          color: #000000;
        }

        /* Screen Presentation for A4 Sheets */
        @media screen {
          .memo-page-sheet {
            margin-bottom: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          }
        }

        /* Compact Modern Minimal Header Styles */
        .memo-header {
          width: 100%;
          margin-bottom: 3.5mm;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .memo-header-main {
          width: 100%;
          min-height: 24mm;
          display: flex;
          align-items: center;
        }

        .memo-logo-container {
          width: 35mm;
          min-width: 35mm;
          height: 23mm;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .memo-logo {
          width: 100%;
          max-height: 23mm;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
        }

        .memo-header-divider {
          width: 1px;
          height: 20mm;
          align-self: center;
          background: #c6a36b;
          margin: 0 5mm;
          flex-shrink: 0;
        }

        .memo-heading-group {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          justify-content: center;
        }

        .memo-title {
          margin: 0;
          color: #000000;
          font-family: 'Angsana New', 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 17pt;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: 0.16em;
          white-space: nowrap;
        }

        .memo-department {
          margin: 1.2mm 0 0;
          color: #000000;
          font-family: 'Angsana New', 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 11pt;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .memo-document-number {
          margin-left: auto;
          align-self: center;
          color: #000000;
          font-family: 'Angsana New', 'TH Sarabun New', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 14pt;
          font-weight: 700;
          white-space: nowrap;
          text-align: right;
          padding-left: 3mm;
          flex-shrink: 0;
        }

        .memo-header-rule {
          width: 100%;
          height: 1px;
          margin-top: 2.5mm;
          background: #c6a36b;
        }

        /* Content typography and indentation */
        .memo-content-page-blocks p,
        .memo-content p {
          text-indent: 1.5cm;
          margin-bottom: 0.35rem;
        }

        .memo-content-page-blocks h1,
        .memo-content-page-blocks h2,
        .memo-content-page-blocks h3,
        .memo-content-page-blocks h4,
        .memo-content-page-blocks ul,
        .memo-content-page-blocks ol,
        .memo-content-page-blocks table {
          text-indent: 0 !important;
        }

        /* Non-splittable block elements */
        .memo-closing-block {
          text-indent: 1.5cm;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-weight: 700;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .memo-signature-group,
        .memo-signature-row,
        .memo-signature-item {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .memo-footer-note {
          margin-top: auto !important;
          width: 100%;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Strict Multi-Page A4 Print Rules */
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 210mm !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ===== LAYOUT FIX: Target only direct container DIVs/MAIN under body
             and strictly exclude all non-visual elements (script, style, noscript, etc.)
             to prevent JavaScript source code from being rendered in print. ===== */
          body > div,
          body > main,
          body > *:not(script):not(style):not(noscript):not(template):not(nextjs-portal) {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            float: none !important;
            overflow: visible !important;
            min-height: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* Crucial: Absolutely hide all scripts, styles, metadata, and dev overlays
             so their source code / hydration payloads are never displayed as text */
          script,
          style,
          noscript,
          template,
          body > script,
          body script,
          nextjs-portal,
          [data-nextjs-toast],
          [data-nextjs-dev-tools],
          [data-nextjs-dialog-overlay] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            max-height: 0 !important;
            max-width: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            pointer-events: none !important;
            clip: rect(0, 0, 0, 0) !important;
            clip-path: inset(50%) !important;
          }

          main {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Hide Sidebar, nav, footer, action bar, status badges, and all print:hidden */
          nav, aside,
          header:not(.memo-header),
          footer,
          [class*="print:hidden"],
          .print\\:hidden {
            display: none !important;
          }

          /* Hide extension overlays, ad-skippers, dev tools */
          [class*="ad-skip" i],
          [class*="adskip" i],
          [class*="ad_skip" i],
          [class*="skipp" i],
          [id*="ad-skip" i],
          [id*="adskip" i],
          [id*="ad_skip" i],
          [id*="skipp" i],
          [class*="extension" i],
          [id*="extension" i],
          div[style*="position: fixed"]:not(.memo-page-sheet),
          div[style*="position:fixed"]:not(.memo-page-sheet) {
            display: none !important;
          }

          /* ===== MEMO DOCUMENT: Ensure it is visible and fills the page ===== */
          .memo-document-container {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .memo-measurement-container {
            display: none !important;
          }

          .memo-document-container * {
            visibility: visible !important;
          }

          /* Print Sheet Rules */
          .memo-page-sheet {
            visibility: visible !important;
            width: 210mm !important;
            height: 296.5mm !important;
            max-height: 296.5mm !important;
            margin: 0 !important;
            padding: 14mm 18mm 22mm 20mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            break-after: page !important;
            page-break-after: always !important;
          }

          /* EXACT RULE 4: Cancel page break ONLY on the last page with auto */
          .memo-page-sheet:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .memo-header-divider,
          .memo-header-rule {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}

// ========================================================
// SIGNATURE RENDERING FUNCTIONS
// ========================================================
function renderSignatures(signatures: MemoSignatureItem[]) {
  if (!signatures || signatures.length === 0) return null;

  const count = signatures.length;

  if (count === 1) {
    return (
      <div className="memo-signature-row flex justify-center">
        <SignatureBox sig={signatures[0]} width="w-56" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="memo-signature-row flex justify-center gap-x-28">
        {signatures.map((sig, idx) => (
          <SignatureBox key={idx} sig={sig} width="w-52" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="memo-signature-row flex justify-center gap-x-12">
        {signatures.map((sig, idx) => (
          <SignatureBox key={idx} sig={sig} width="w-48" />
        ))}
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="flex flex-col gap-y-7">
        <div className="memo-signature-row flex justify-center gap-x-28">
          {signatures.slice(0, 2).map((sig, idx) => (
            <SignatureBox key={idx} sig={sig} width="w-52" />
          ))}
        </div>
        <div className="memo-signature-row flex justify-center gap-x-28">
          {signatures.slice(2, 4).map((sig, idx) => (
            <SignatureBox key={idx + 2} sig={sig} width="w-52" />
          ))}
        </div>
      </div>
    );
  }

  if (count === 5) {
    return (
      <div className="flex flex-col gap-y-7">
        {/* Row 1: 2 signatures */}
        <div className="memo-signature-row flex justify-center gap-x-28">
          {signatures.slice(0, 2).map((sig, idx) => (
            <SignatureBox key={idx} sig={sig} width="w-52" />
          ))}
        </div>
        {/* Row 2: 3 signatures */}
        <div className="memo-signature-row flex justify-center gap-x-10">
          {signatures.slice(2, 5).map((sig, idx) => (
            <SignatureBox key={idx + 2} sig={sig} width="w-48" />
          ))}
        </div>
      </div>
    );
  }

  if (count === 6) {
    return (
      <div className="flex flex-col gap-y-7">
        <div className="memo-signature-row flex justify-center gap-x-10">
          {signatures.slice(0, 3).map((sig, idx) => (
            <SignatureBox key={idx} sig={sig} width="w-48" />
          ))}
        </div>
        <div className="memo-signature-row flex justify-center gap-x-10">
          {signatures.slice(3, 6).map((sig, idx) => (
            <SignatureBox key={idx + 3} sig={sig} width="w-48" />
          ))}
        </div>
      </div>
    );
  }

  // More than 6: rows of up to 3
  const rows = [];
  for (let i = 0; i < count; i += 3) {
    rows.push(signatures.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col gap-y-6">
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="memo-signature-row flex justify-center gap-x-10">
          {row.map((sig, sIdx) => (
            <SignatureBox key={sIdx} sig={sig} width="w-48" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SignatureBox({ sig, width = "w-48" }: { sig: MemoSignatureItem; width?: string }) {
  return (
    <div className={`memo-signature-item ${width} text-center flex flex-col items-center`}>
      <div className="font-semibold text-[14pt] text-black mb-0.5">{sig.role}</div>
      {/* Physical handwritten signature whitespace */}
      <div className="h-14 w-full" />
      <div className="font-medium text-[14pt] text-black mb-0.5">{sig.name || ''}</div>
      <div className="text-[12.5pt] text-black">
        {sig.position ? `( ${sig.position} )` : ''}
      </div>
    </div>
  );
}
