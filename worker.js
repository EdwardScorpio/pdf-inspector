import init, { processPdf } from '/pdf-inspector/pdf_inspector_wasm.js';

let ready = false;
let err = null;

init().then(function () {
  ready = true;
  postMessage({ type: 'ready' });
}).catch(function (e) {
  err = String(e);
  postMessage({ type: 'error', message: 'wasm init: ' + err });
});

self.onmessage = function (event) {
  var msg = event.data;
  if (!msg || msg.type !== 'convert') return;
  if (!ready) {
    postMessage({ id: msg.id, type: 'done', error: err || 'not ready yet' });
    return;
  }
  try {
    var opts = {};
    if (msg.compact) opts.profile = 'compact';
    var r = processPdf(new Uint8Array(msg.buffer), opts);
    postMessage({
      id: msg.id,
      type: 'done',
      result: {
        pdfType: r.pdfType,
        pageCount: r.pageCount,
        processingTimeMs: r.processingTimeMs,
        confidence: r.confidence,
        pagesNeedingOcr: r.pagesNeedingOcr,
        markdown: r.markdown
      }
    }, [msg.buffer]);
  } catch (e) {
    postMessage({ id: msg.id, type: 'done', error: String(e) });
  }
};
