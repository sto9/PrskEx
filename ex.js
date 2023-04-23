const getResult = (text) => {
  console.log(text);

}

const sleep = waitTime => new Promise(resolve => setTimeout(resolve, waitTime));

async function getMonotoneImage(url, clip_param) {
  let canvas = document.createElement("canvas");
  Caman(canvas, url, function () {
    this.clip(clip_param); // ここを調整 50~60 が良い感じ
    this.greyscale();
    this.invert();
    this.contrast(100); // ここも改善の余地あり
    this.render();
  });
  await sleep(200);
  let img = document.createElement("img");
  img.src = canvas.toDataURL();
  return img;
}

async function clipImage(img_monotone) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = img_monotone.width / 3;
  canvas.height = img_monotone.height * 3 / 8;
  ctx.drawImage(img_monotone, img_monotone.width / 3, img_monotone.height / 2,
    canvas.width, canvas.height,
    0, 0,
    canvas.width, canvas.height
  );
  // document.getElementById("test").appendChild(canvas);
  return canvas.toDataURL();
}

// 全て数字かつ4文字のものを抽出
async function getScoreArrayStrict(words) {
  let numbers = []; // 内訳
  for (let i in words) {
    if (/^\d{4}$/.test(words[i]) && words[i][0] <= '3')
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
    if (words[i].length == 4 && words[i][0] <= '3')
      numbers.push(Number(words[i]));
  }
  return numbers;
}
async function getScoreArray(img) {
  const data = await Tesseract.recognize(img, 'eng', {
    psm: 6,
    tessedit_char_blacklist: 'OI',
    logger: function (m) {
      console.log(m.status);
      document.getElementById('progress').textContent = m.status;
    }
  });
  let words = data.data.text.split(/[ \n]+/);

  let numbers = await getScoreArrayStrict(words);
  if (numbers.length == 6 && numbers[5] == "1111")
    numbers.pop();
  if (numbers.length == 5) return numbers;

  numbers = await getScoreArrayEase(words);
  if (numbers.length == 6 && numbers[5] == "1111")
    numbers.pop();
  if (numbers.length == 5) return numbers;

  return [];
}

function calcExScore(scores) {
  let sum = 0;
  for (let i = 0; i < 3; i++)
    sum += scores[i] * (3 - i);
  return sum;
}

async function setPreview(url) {
  let preview = document.getElementById("preview");
  preview.src = url;
  preview.style.border = '';
  preview.style.width = '';
}

function resetTable() {
  let tr_elements = document.getElementById("table-result").children;
  for (let i = 0; i < tr_elements.length; i++) {
    let td = tr_elements[i].children[1];
    td.innerText = "-";
    td.classList.replace("text-right", "text-center")
  }
  let ex_element = document.getElementById("ex-score");
  ex_element.innerText = "";
}

function setTable(scores) {
  let tr_elements = document.getElementById("table-result").children;
  for (let i = 0; i < tr_elements.length; i++) {
    let td = tr_elements[i].children[1];
    td.innerText = scores[i];
    td.classList.replace("text-center", "text-right")
  }
  const exscore = calcExScore(scores);
  let ex_element = document.getElementById("ex-score");
  ex_element.innerText = "EX-SCORE: " + exscore;
}

async function recognize() {
  resetTable();
  const fileInput = document.getElementById('file-upload');
  const pic = fileInput.files[0];
  let url = window.URL.createObjectURL(pic);
  setPreview(url);
  const CLIP_PARAM = [0, 50, 60, 52, 54, 56, 58];
  let scores;
  for (let ci = 0; ci < CLIP_PARAM.length; ci++) {
    console.log(CLIP_PARAM[ci]);
    let img_monotone = await getMonotoneImage(url, CLIP_PARAM[ci]);
    let img_rec = await clipImage(img_monotone);
    scores = await getScoreArray(img_rec);
    console.log(scores);
    if (scores.length == 5) break;
  }
  if (scores.length == 0) {
    // エラー処理
    document.getElementById('progress').textContent = "Error";
    return;
  }
  setTable(scores);
  document.getElementById('progress').textContent = "finished";
}
