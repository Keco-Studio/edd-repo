const viewTitles = {
  overview: "核心玩法原型总览",
  slices: "已完成的开发成果",
  evidence: "验证证据与成本",
  review: "三项人工评价",
  files: "成果文件入口"
};

const navButtons = [...document.querySelectorAll("[data-view]")];
const views = [...document.querySelectorAll(".view")];
const title = document.querySelector("#page-title");
const toast = document.querySelector("#toast");

function switchView(viewId) {
  navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewId));
  views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  title.textContent = viewTitles[viewId];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

navButtons.forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelectorAll("[data-go-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.goView));
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    showToast("工作区路径已复制");
  });
});

const reviewForm = document.querySelector("#review-form");
const reviewStorageKey = "paws-patience-human-review-v1";
const reviewProgress = document.querySelector("#review-progress");
const reviewProgressNote = document.querySelector("#review-progress-note");
const eddTotal = document.querySelector("#edd-total");

function emptyReview() {
  return {
    artStyle: { score: null, comment: null, nextIteration: null },
    playerFun: { score: null, comment: null, nextIteration: null },
    tokenEfficiency: { score: null, comment: null, nextIteration: null }
  };
}

function readReviewForm() {
  const review = emptyReview();
  new FormData(reviewForm).forEach((value, key) => {
    const [dimension, field] = key.split(".");
    const normalized = String(value).trim();
    review[dimension][field] = normalized === "" ? null : field === "score" ? Number(normalized) : normalized;
  });
  return review;
}

function updateReviewSummary() {
  const review = readReviewForm();
  const scores = Object.values(review).map((entry) => entry.score).filter((score) => Number.isFinite(score));
  const complete = scores.length === 3;
  reviewProgress.textContent = `${scores.length} / 3`;
  reviewProgressNote.textContent = complete ? "已填写" : "等待填写";
  eddTotal.textContent = complete ? `当前总分：${scores.reduce((sum, score) => sum + score, 0)} / 30` : "当前总分：未完成";
}

// 人工输入只写浏览器本地存储，避免无意覆盖权威 Keco 结果。
function saveReview() {
  localStorage.setItem(reviewStorageKey, JSON.stringify(readReviewForm()));
  updateReviewSummary();
}

function restoreReview() {
  const saved = localStorage.getItem(reviewStorageKey);
  if (!saved) return;
  const review = JSON.parse(saved);
  Object.entries(review).forEach(([dimension, fields]) => {
    Object.entries(fields).forEach(([field, value]) => {
      const control = reviewForm.elements.namedItem(`${dimension}.${field}`);
      if (control) control.value = value ?? "";
    });
  });
}

reviewForm.addEventListener("input", saveReview);
restoreReview();
updateReviewSummary();

document.querySelector("#export-review").addEventListener("click", () => {
  const payload = {
    version: 1,
    projectName: "test8-24",
    runId: "paws-patience-20260825-1618",
    snapshotHash: "sha256:1ac445303894be6cc489aa360ef1cca1060e44b718f5ebb02601ff3256f4abfa",
    exportedAt: new Date().toISOString(),
    humanReview: readReviewForm()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "paws-patience-human-review.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("人工评价 JSON 已导出");
});
