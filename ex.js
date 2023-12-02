const sleep = waitTime => new Promise(resolve => setTimeout(resolve, waitTime));

async function getMonotoneImage(url, param) {
  let canvas = document.createElement("canvas");
  Caman(canvas, url, function () {
    this.clip(param[0]); // ここを調整 50~60 が良い感じ
    this.greyscale();
    this.invert();
    this.contrast(param[1]); // ここも改善の余地あり
    this.render();
  });
  await sleep(500); // そのうち直す
  return canvas;
}

async function clipImage(img_monotone) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = img_monotone.width * 3 / 8;
  canvas.height = img_monotone.height / 2;
  ctx.drawImage(img_monotone, 0, img_monotone.height / 2,
    canvas.width, canvas.height,
    0, 0,
    canvas.width, canvas.height
  );
  return canvas.toDataURL();
}

// 全て数字かつ4文字のものを抽出
async function getScoreArrayStrict(words) {
  let numbers = []; // 内訳
  for (let i in words) {
    if (/^\d{4}$/.test(words[i]))
      numbers.push(Number(words[i]));
  }
  return numbers;
}
// 数字以外を消すと4文字のものを抽出
async function getScoreArrayEase(words) {
  let numbers = []; // 内訳
  for (let i in words) {
    // 数字以外消す
    words[i] = words[i].replace(/[^0-9]/g, '');
    if (words[i].length == 4)
      numbers.push(Number(words[i]));
  }
  return numbers;
}

// 画像認識
async function getScoreArray(img) {
  document.getElementById('progress').textContent = "Loading...";
  const data = await Tesseract.recognize(img, 'eng', {
    psm: 6,
    // tessedit_char_blacklist: 'OI',
  });
  let words = data.data.text.split(/[ \n]+/);
  for (let i = 0; i < words.length; i++) {
    words[i] = words[i].replace(/O/g, '0');
  }

  let numbers = await getScoreArrayStrict(words);
  if (numbers.length == 5) return numbers;

  numbers = await getScoreArrayEase(words);
  if (numbers.length == 5) return numbers;

  return [];
}

// TEXT_SUFFIX = ['perfect', 'great', 'good', 'bad', 'miss'];
TEXT_SUFFIX = ['perfect', 'great', 'good'];

function resetTable(from_btn = false) {
  for (let i = 0; i < TEXT_SUFFIX.length; i++) {
    let id = "text-" + TEXT_SUFFIX[i];
    let input = document.getElementById(id);
    input.value = "";
  }
  document.getElementById("ex-score").innerText = "";
  document.getElementById('progress').textContent = "";
  document.getElementById("preview").src = "";
  if (from_btn) document.getElementById('file-upload').value = "";
}

function setTable(scores) {
  for (let i = 0; i < TEXT_SUFFIX.length; i++) {
    let id = "text-" + TEXT_SUFFIX[i];
    let input = document.getElementById(id);
    input.value = scores[i];
  }
}

async function recognize() {
  resetTable();
  const fileInput = document.getElementById('file-upload');
  const pic = fileInput.files[0];
  let url = window.URL.createObjectURL(pic);
  let preview = document.getElementById("preview");
  preview.src = url;
  CLIP_PARAM = [[0, 100], [50, 100], [60, 100], [50, 0]];
  let scores;
  for (let ci = 0; ci < CLIP_PARAM.length; ci++) {
    let img_monotone = await getMonotoneImage(url, CLIP_PARAM[ci]);
    let img_rec = await clipImage(img_monotone);
    scores = await getScoreArray(img_rec);
    if (scores.length == 5) break;
  }
  if (scores.length == 0) {
    // エラー処理
    document.getElementById('progress').textContent = "エラー：読み取れませんでした";
    return;
  }
  setTable(scores);
  document.getElementById('progress').textContent = "";
}

function calcScore() {
  let total = 0;
  for (let i = 0; i < TEXT_SUFFIX.length; i++) {
    let id = "text-" + TEXT_SUFFIX[i];
    let score_text = document.getElementById(id).value;
    let score;
    if (score_text == "") {
      score = 0;
    } else if (isNaN(score_text)) { // エラー
      let ex_element = document.getElementById("ex-score");
      ex_element.innerText = "<error>";
      return;
    } else {
      score = Number(score_text);
    }
    total += (3 - i) * score;
  }
  let ex_element = document.getElementById("ex-score");
  ex_element.innerText = total;
}
