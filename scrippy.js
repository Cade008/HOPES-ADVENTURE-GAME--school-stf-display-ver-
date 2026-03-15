//---------- Checkpoints ----------//
const CHECKPOINT_KEY = "gameCheckpointv1000";
let CUTSCENE_ACTIVE = false;
let INTRO_PLAYING = false;

//save
function saveCheckpoint(sequenceIndex, slideIndex) {
  localStorage.setItem(
    CHECKPOINT_KEY,
    JSON.stringify({ sequenceIndex, slideIndex })
  );
}

//load
function loadCheckpoint() {
  const raw = localStorage.getItem(CHECKPOINT_KEY);
  if (!raw) return { sequenceIndex: 0, slideIndex: null };

  try {
    return JSON.parse(raw);
  } catch {
    return { sequenceIndex: 0, slideIndex: null };
  }
}

//avoids overlap
function clearCheckpoint() {
  localStorage.removeItem(CHECKPOINT_KEY);
}

//---------- Checkpoints ----------//

//---------- Common functions/variables ----------//
console.log("GAME1 JS LOADED — VERSION 1000");

// general setting for images
function draw(img) {
  if (!img) return;
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

// Show a single image briefly then call done
function showSingleImage(img, done, delay = 750) {
  draw(img);
  setTimeout(() => done && done(), delay);
}

// hides map in other games
function hideMap() {
  const map = document.getElementById("mapContainer");
  if (map) map.style.display = "none";
}

// for intro
function playVideo(src, done) {
  const video = document.getElementById("introVideo");
  const canvas = document.getElementById("gameCanvas");
  const map = document.getElementById("mapContainer");
  const slideControls = document.getElementById("slideControls");

  // Hides everything else
  if (canvas) canvas.style.display = "none";
  if (map) map.style.display = "none";
  if (slideControls) slideControls.style.display = "none";

  video.src = src;
  video.style.display = "block";
  video.currentTime = 0;
  video.controls = false;

  video.play();

  // for automatic play of the very game after intro
  video.onended = () => {
    video.pause();
    video.style.display = "none";
    video.src = "";

    done && done();
  };
}

// central getter for answer box
function getAnswerBox() {
  return document.getElementById("answerBox");
}

// show the answer box
function showAnswerBox() {
  const el = getAnswerBox();
  if (!el) {
    console.warn("showAnswerBox: #answerBox not found");
    return null;
  }

  console.log("shown box working");

  el.style.display = "block";
  try { el.value = ""; el.focus(); } catch (e) {}

  // reset old listeners to prevent stacking
  el.replaceWith(el.cloneNode(true)); 
  // this removes all previous event listeners

  return document.getElementById("answerBox"); // re-get cloned element
}

// hides the answer box in other parts
function hideAnswerBox() {
  const el = getAnswerBox();
  if (!el) return;

  el.style.display = "none";
}


// to avoid overlapping images
function clearInputs() {
  const canvas = getCanvas();
  canvas.onclick = null;
  window.onkeydown = null;
}

// preaload
const slides = {};
const allImages = [];

function preloadFolder(folder, start, end) {
  const promises = [];
  for (let i = start; i <= end; i++) {
    const key = `${folder}/${i}.png`;
    const img = new Image();
    const p = new Promise((res) => {
      img.onload = res;
      img.onerror = () => { console.error("FAILED TO LOAD", key); res(); };
    });
    img.src = key;
    slides[key] = img;
    allImages.push(img);
    promises.push(p);
  }
  return Promise.all(promises);
}

let W1 = [];
let W2 = [];
let W3 = [];
let BW =[];

window.addEventListener("load", async () => {
  await preloadFolder("./W1_Images", 1, 144);
  await preloadFolder("./W2_Images", 1, 21);
  await preloadFolder("./W3_Images", 1, 58);
  await preloadFolder("./Between_worlds", 1, 19);

  for (let i = 1; i <= 200; i++) {
    W1[i] = slides[`./W1_Images/${i}.png`];
    W2[i] = slides[`./W2_Images/${i}.png`];
    W3[i] = slides[`./W3_Images/${i}.png`];
    BW[i] = slides[`./Between_worlds/${i}.png`];
  }
});



// creates canvas
function getCanvas() {
  let canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";
  return canvas;
}

// gathers slide controls
function getSlideControls() {
  const sc = document.getElementById("slideControls");
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  const skip = document.getElementById("skipBtn");

  if (!sc || !prev || !next || !skip) return null;

  return { sc, prev, next, skip };
}

// for displaying slide controls in specific parts
function showSlideControls(show = true, allowSkip = true) {
  const controls = getSlideControls();
  if (!controls) return;

  controls.sc.style.display = show ? "flex" : "none";
  controls.skip.style.display = show && allowSkip ? "block" : "none";
}


// displays skip in necessary parts
function showSkip(onSkip) {
  const skip = document.getElementById("skipBtn");
  skip.style.display = "block";
  skip.onclick = () => {
    hideSkip();
    onSkip && onSkip();
  };
  }

// hides skip in other parts
function hideSkip() {
  skipBtn.style.display = "none";
  skipBtn.onclick = null;
}

function hideSubmitButton() {
  const btn = document.getElementById("submitAnswer");
  if (btn) btn.style.display = "none";
}

function showSubmitButton() {
  const btn = document.getElementById("submitAnswer");
  if (btn) btn.style.display = "inline-block";
}


// for smooth flow of images
function runRange(folder, start, end, onDone, allowSkip = true, autoDelay = 0) {
  let current = start;
  const total = end;

  const controls = getSlideControls();
  if (!controls) {
    console.warn("Slide controls not found! Showing slides without buttons.");
    drawSlide(current);
    if (autoDelay > 0) {
      autoAdvance();
    }
    return;
  }

  const { prev, next, skip } = controls;


  showSlideControls(true, allowSkip);
  drawSlide(current);

  // button functions
  next.onclick = () => {
    if (current < total) {
      current++;
      drawSlide(current);
    } else {
      cleanup();
      onDone?.();
    }
  };

  prev.onclick = () => {
    if (current > start) {
      current--;
      drawSlide(current);
    }
  };

  skip.onclick = () => {
    if (!allowSkip) return;
    cleanup();
    onDone?.();
  };

  // in case for automatic display
  if (autoDelay > 0) {
    setTimeout(autoAdvance, autoDelay);
  }

  function autoAdvance() {
    if (current < total) {
      current++;
      drawSlide(current);
      setTimeout(autoAdvance, autoDelay);
    } else {
      cleanup();
      onDone?.();
    }
  }

  function drawSlide(index) {
    const img = slides[`${folder}/${index}.png`] || slides[`${folder}/${index}`];
    if (!img) {
      console.warn("Slide not found:", `${folder}/${index}`);
      return;
    }
    draw(img);
  }

  function cleanup() {
    showSlideControls(false);
    next.onclick = null;
    prev.onclick = null;
    skip.onclick = null;
  }
}

function playSound() {
  const sound = document.getElementById("clickSound");
  sound.volume = 0.4;
  sound.currentTime = 0; // resets so it overlaps cleanly
  sound.play();

}

$(document).ready(function () {
  $x = 0;
  // Select the button by its ID and attach a click event handler
  $("#button").click(function () {
    const text = $("#answer").val();
    const correct = "a";

    if (text === correct) {
      alert("Correct!");
      localStorage.setItem("correctItems", $x++);
    } else {
      alert("Incorrect. Try again.");
    }

    // Code to execute when the button is clicked
  });
});

// button controls for game 1 lessons
const btnYes = document.getElementById("btnYes");
const button = $("#btnYes");

const yesNoContainer = document.getElementById("yesNoContainer");

function showYesNo(onYes, onNo) {
  yesNoContainer.style.display = "block";

  btnYes.onclick = () => {
    yesNoContainer.style.display = "none";
    onYes && onYes();
  };

  btnNo.onclick = () => {
    yesNoContainer.style.display = "none";
    onNo && onNo();
  };
}

// same as runRange but automatic
function showSlidesBetween(folder, start, end, onDone, delay = 2500) {
  let current = start;

  function showSlide(folder, index) {
    const img = slides[`${folder}/${index}.png`] || slides[`${folder}/${index}`];
    if (!img) {
      console.warn("Slide not found:", `${folder}/${index}`);
      return;
    }
    draw(img);
  }

  showSlide(folder, current);

  const timer = setInterval(() => {
    current++;
    if (current > end) {
      clearInterval(timer);
      onDone?.();
    } else {
      showSlide(folder, current);
    }
  }, delay);
}


//---------- Common functions and variables ----------//


//---------- intro ----------//
let INTRO_PLAYED = false;

function showIntroStartImage() {
  const img = document.getElementById("startIntroImage");
  hideMap();
  hideAnswerBox();
  hideSkip();
  hideSubmitButton();

  if (!img) return;

  img.style.display = "block";

  img.onclick = () => {
  playSound();
  img.style.display = "none";
  img.onclick = null;
  runSequence();
};
};

// Plays the intro video only once
function playIntroVideo(done) {
  INTRO_PLAYING = true;

  const video = document.getElementById("introVideo");
  const canvas = getCanvas();
  canvas.style.display = "block";

  video.pause();
  video.currentTime = 0;
  video.style.display = "block";
  video.controls = true;
  video.muted = false;
  video.play().catch(err => console.warn(err));

  const onEnded = () => {
    INTRO_PLAYING = false;

    video.style.display = "none";
    video.controls = false;
    video.removeEventListener("ended", onEnded);

    runRange("./Between_worlds", 7, 15, () => {
      done && done();
    }, false, 0);
  };

  video.addEventListener("ended", onEnded);
}


//---------- intro ----------//


//---------- world 1 ----------//
function Game1setup(questions, doneCallback) {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  hideAnswerBox();

  let currentIndex = 0;
  let playerHealth = 3;

  const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
  let displayRunning = false;

  function drawQuestion() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(questions[currentIndex].img);
  }

  function onKey(event) {
    if (displayRunning) return;
    const choice = keyMap[event.key];
    if (!choice) return;

    const q = questions[currentIndex];
    if (choice === q.a) {
      currentIndex++;
      display();
    } else {
      playerHealth--;
      displayRunning = true;
      showSingleImage(q.wrongImg, () => {
        if (playerHealth <= 0) {
          alert("Game Over! Restarting!");
          currentIndex = 0;
          playerHealth = 3;
        }
        displayRunning = false;
        drawQuestion();
      });
    }
  }

  function display() {
    if (displayRunning) return;

    if (currentIndex < questions.length) {
      drawQuestion();
      displayRunning = false;
      return;
    }

    window.removeEventListener("keydown", onKey);
    doneCallback && doneCallback();
  }

  window.addEventListener("keydown", onKey);
  display();
}

// parts
function Game1_pt1(done) {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  
  hideAnswerBox();
  const choiceSlide = W1[20];
  const lesson = [21, 29];
  const intro = [30, 35];
  const outro = [46, 47];
  const questions = [
    { img: W1[36], a: "D", wrongImg: W1[37] },
    { img: W1[38], a: "B", wrongImg: W1[39] },
    { img: W1[40], a: "C", wrongImg: W1[41] },
    { img: W1[42], a: "C", wrongImg: W1[43] },
    { img: W1[44], a: "C", wrongImg: W1[45] }
  ];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(choiceSlide);

   ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(choiceSlide);

  showYesNo(
    () => {
      runRange("./W1_Images", lesson[0], lesson[1], startGameIntro);
    },
    () => {
      startGameIntro();
    }
  );

  function startGameIntro() {
    runRange("./W1_Images", intro[0], intro[1], () => {
      Game1setup(questions, () => {
        showSlidesBetween(
          "./W1_Images",
          outro[0],
          outro[1],
          done,
          1000
        );
      });
    });
  }
}

function Game1_pt2(done) {
  hideAnswerBox();
  const choiceSlide = W1[48];
  const lesson = [49,59];
  const intro = [60, 65];
  const outro = [77, 78];
  const questions = [
    { img: W1[66], a: "A", wrongImg: W1[67] },
    { img: W1[68], a: "C", wrongImg: W1[69] },
    { img: W1[70], a: "D", wrongImg: W1[71] },
    { img: W1[72], a: "B", wrongImg: W1[73] },
    { img: W1[74], a: "A", wrongImg: W1[75] }
  ];

  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");

   ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(choiceSlide);

  showYesNo(

    () => {
      runRange("./W1_Images", lesson[0], lesson[1], startGameIntro);
    },

     
    () => {
      startGameIntro();
    }
  );

  function startGameIntro() {
    runRange("./W1_Images", intro[0], intro[1], () => {
      Game1setup(questions, () => {
        showSlidesBetween(
          "./W1_Images",
          outro[0],
          outro[1],
          done,
          1000
        );
      });
    });
  }
}

function Game1_pt3(done) {
  hideAnswerBox();
  const choiceSlide = W1[79];
  const lesson = [80, 95];
  const intro = [96, 100];
  const outro = [112, 113];
  const questions = [
    { img: W1[101], a: "A", wrongImg: W1[102] },
    { img: W1[103], a: "B", wrongImg: W1[104] },
    { img: W1[105], a: "C", wrongImg: W1[106] },
    { img: W1[107], a: "C", wrongImg: W1[108] },
    { img: W1[109], a: "B", wrongImg: W1[110] }
  ];

  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");

   ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(choiceSlide);

  showYesNo(

    () => {
      runRange("./W1_Images", lesson[0], lesson[1], startGameIntro);
    },

     
    () => {
      startGameIntro();
    }
  );

  function startGameIntro() {
    runRange("./W1_Images", intro[0], intro[1], () => {
      Game1setup(questions, () => {
        showSlidesBetween(
          "./W1_Images",
          outro[0],
          outro[1],
          done,
          1000
        );
      });
    });
  }
}

function Game1_pt4(done) {
  hideAnswerBox();
  const choiceSlide = W1[114];
  const lesson = [115, 121];
  const intro = [122, 128];
  const outro = [140, 141];
  const questions = [
    { img: W1[129], a: "C", wrongImg: W1[130] },
    { img: W1[131], a: "C", wrongImg: W1[132] },
    { img: W1[133], a: "C", wrongImg: W1[134] },
    { img: W1[135], a: "D", wrongImg: W1[136] },
    { img: W1[137], a: "D", wrongImg: W1[138] }
  ];

  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");

   ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(choiceSlide);

  showYesNo(

    () => {
      runRange("./W1_Images", lesson[0], lesson[1], startGameIntro);
    },

    () => {
      startGameIntro();
    }
  );

  function startGameIntro() {
    runRange("./W1_Images", intro[0], intro[1], () => {
      Game1setup(questions, () => {
        showSlidesBetween(
          "./W1_Images",
          outro[0],
          outro[1],
          done,
          1000
        );
      });
    });
  }
}

function Game1Intro(done) {
  hideMap();
  hideAnswerBox();
  hideSkip();

  const canvas = getCanvas();
  canvas.style.display = "block";

  runRange("./W1_Images", 1, 18, () => {
    done && done();
  }, false, 0);
}

function Game1Outro(done) {
  const map = document.getElementById("mapContainer");
  const canvas = getCanvas();

  // Hide map, show canvas
  map.style.display = "none";
  canvas.style.display = "block";

  // Hide slide controls if any
  const controls = getSlideControls();
  if (controls) controls.sc.style.display = "none";

  // Show the outro slides automatically
  showSlidesBetween("./W1_Images", 142, 144, () => {
   runRange("./Between_worlds", 16, 17, () => {
  canvas.style.display = "none";
  done && done();
}, false, 0);
  });

}

function Game1(done) {
  const map = document.getElementById("mapContainer");
  const canvas = getCanvas();
  hideSubmitButton();
  hideAnswerBox();
  hideSkip();

  function startWorld1() {
    map.style.display = "block";
    canvas.style.display = "none";

    const stations = document.querySelectorAll(".station");
    const playedStations = {};
    const games = { pt1: Game1_pt1, pt2: Game1_pt2, pt3: Game1_pt3, pt4: Game1_pt4 };

    function playStation(btn) {
      const gameKey = btn.dataset.game;
      if (!games[gameKey] || playedStations[gameKey]) return;

      map.style.display = "none";
      canvas.style.display = "block";

      games[gameKey](() => {
        playedStations[gameKey] = true;
        btn.style.pointerEvents = "none";

        canvas.style.display = "none";
        map.style.display = "block";

        if (Object.keys(playedStations).length === stations.length) {
          Game1Outro(done);
        }
      });
    }

    stations.forEach((btn) => {
      btn.onclick = null;
      btn.addEventListener("click", () => playStation(btn));
    });
  }

  Game1Intro(startWorld1);
}
//--------- world 1 -----------//


//---------- world 2 ----------//
let GAME2_PLAYED = false;
function Game2(done) {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  const answerBox = getAnswerBox();
  if (answerBox) answerBox.style.display = "block";
  hideSkip();
  hideMap();
  showSubmitButton();

  let currentIndex = 0;
  let playerHealth = 2;
  let finished = false;
  let instruction = false;

  const questions = [
    {
      img: W2[11],
      answers: ["2/6", "1/3"],
      correctImg: W2[13],
      wrongImg: W2[12],
    },
    { img: W2[14], answers: ["1/4"], correctImg: W2[16], wrongImg: W2[15] },
    {
      img: W2[17],
      answers: ["5/5", "1"],
      correctImg: W2[19],
      wrongImg: W2[18],
    },
  ];

  function display() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentIndex < questions.length) {
        draw(questions[currentIndex].img);
    } else if (!finished) {
        finished = true;
        GAME2_PLAYED = true;
      if (answerBox) answerBox.style.display = "none";
      hideSubmitButton();

      showSlidesBetween("./W2_Images", 20, 21, () => {
       runRange("./Between_worlds", 18, 19, () => {
        canvas.style.display = "none";
          done && done();
          }, false, 0);
  });
  };
  }

  function handleAnswer() {
  if (finished) return;

  const input = (answerBox?.value || "").trim();
  const q = questions[currentIndex];

  if (q.answers.includes(input)) {
    showSingleImage(q.correctImg, () => {
      currentIndex++;
      if (answerBox) answerBox.value = "";
      display();
    });
  } else {
    showSingleImage(q.wrongImg, () => {
      playerHealth--;
      if (playerHealth <= 0) {
        alert("Game Over! Restarting.");
        currentIndex = 0;
        playerHealth = 2;
      }
      display();
    });
  }
}

  if (GAME2_PLAYED) {
    console.warn("Game2 already played — skipping");
    done && done();
    return;
  }

  const submitBtn = document.getElementById("submitAnswer");
  submitBtn.onclick = handleAnswer;
  display();
}

function lesson2(done) {
  hideMap();
  hideSubmitButton();
  hideAnswerBox();
  hideSkip();

  runRange("./W2_Images", 1, 9, () => {
    hideSubmitButton();
    hideMap();
    hideAnswerBox();
    hideSkip();
    showSlidesBetween("./W2_Images", 10, 10, () => {
      Game2(done);
    }, 3000);
  }, true, 0);
}

//---------- world 3 ----------//
function lesson3(done) {
  document.getElementById("mapContainer").style.display = "none";
  hideAnswerBox();
  hideSubmitButton();

  runRange("./W3_Images", 1, 15, () => {
  showSlidesBetween("./W3_Images", 16, 17, done, 2000);
}, true);
  }

hideSkip();
function Game3setup({ introRange, questionImg, correct, wrongImg, outroRange }, done) {
  hideSubmitButton();
  hideMap();
  hideAnswerBox();
  hideSkip();

  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");

  const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
  let answered = false;

  function showQuestion() {
    hideSkip();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(typeof questionImg === "function" ? questionImg() : questionImg);

    window.removeEventListener("keydown", onKey); // remove old listener
    window.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (answered) return;
    const choice = keyMap[e.key];
    if (!choice) return;

    if (choice === correct) {
      answered = true;
      window.removeEventListener("keydown", onKey);
      if (outroRange) {
        runRange("./W3_Images", outroRange[0], outroRange[1], done, false, 1000);
        showSlideControls(false);
      } else {
        done && done();
      }
    } else {
      showSingleImage(
        typeof wrongImg === "function" ? wrongImg() : wrongImg,
        showQuestion
      );
    }
  }

  if (introRange) {
    runRange("./W3_Images", introRange[0], introRange[1], showQuestion, false, 1000);
    showSlideControls(false);
  } else {
    showQuestion();
  }
}


const World3Questions = [
  {
    introRange: [18, 20],
    questionImg: () => slides[`./W3_Images/21.png`],
    correct: "B",
    wrongImg: () => slides[`./W3_Images/23.png`],
    outroRange: [24, 26]
  },
  {
    introRange: [27, 28],
    questionImg: () => slides[`./W3_Images/29.png`],
    wrongImg: () => slides[`./W3_Images/31.png`],
    correct: "A",
    outroRange: [32, 33]
  },
  {
    introRange: [34, 35],
    questionImg: () => slides[`./W3_Images/36.png`],
    wrongImg: () => slides[`./W3_Images/39.png`],
    correct: "C",
    outroRange: [40, 41]
  },
  {
    introRange: [42, 43],
    questionImg: () => slides[`./W3_Images/44.png`],
    wrongImg: () => slides[`./W3_Images/46.png`],
    correct: "B",
    outroRange: [47, 48]
  },
  {
    introRange: [49, 50],
    questionImg: () => slides[`./W3_Images/51.png`],
    wrongImg: () => slides[`./W3_Images/53.png`],
    correct: "A",
    outroRange: [54, 58]
  }
];


function Game3(done) {
  let index = 0;

  function next() {
    if (index >= World3Questions.length) {
      done && done();
      return;
    }

    Game3setup(World3Questions[index], () => {
      index++;
      next();
    });
  }

  next();
}

//---------- world 3 ----------//


//---------- loaders ----------//
// Sequence of lessons and minigames
const sequence = [playIntroVideo, Game1, lesson2, Game2, lesson3, Game3];

window.addEventListener("DOMContentLoaded", () => {
  showIntroStartImage();
  if (!INTRO_PLAYING) {
    playSound();
  }
});


function runSequence(i = 0) {
  const checkpoint = loadCheckpoint();
  if (checkpoint.sequenceIndex !== undefined && checkpoint.sequenceIndex < sequence.length) {
    i = checkpoint.sequenceIndex;
  }

  if (i >= sequence.length) {
    console.log("Game complete");
    return;
  }

  const step = sequence[i];
  step(() => {
    saveCheckpoint(i + 1, null);
    runSequence(i + 1);
  });
}

console.log(document.getElementById("introVideo"));

document.querySelectorAll(".station").forEach(btn => {
  btn.onclick = () => alert("STATION CLICKED");
});

let INTRO_FORCED = true;
btnYes.onclick = () => alert("YES");
btnNo.onclick = () => alert("NO");

//---------- loaders ----------//