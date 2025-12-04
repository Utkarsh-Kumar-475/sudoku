// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentGame = null;
let boardAPI = null;
let startTime = null;
let timerInterval = null;

// DOM
const newGameBtn = document.getElementById("newGameBtn");
const difficultySel = document.getElementById("difficulty");
const googleBtn = document.getElementById("googleSignIn");
const userInfo = document.getElementById("userInfo");
const leaderboardEl = document.getElementById("leaderboard");
const timerEl = document.getElementById("timer");
const checkBtn = document.getElementById("checkBtn");

googleBtn.addEventListener("click", ()=> signInWithPopup(auth, provider));
onAuthStateChanged(auth, user=>{
  currentUser = user;
  if(user){
    userInfo.textContent = `Signed in: ${user.displayName}`;
    googleBtn.textContent = "Sign out";
    googleBtn.onclick = () => signOut(auth);
  } else {
    userInfo.textContent = "";
    googleBtn.textContent = "Sign in with Google";
    googleBtn.onclick = () => signInWithPopup(auth, provider);
  }
});

newGameBtn.addEventListener("click", startNewGame);

async function startNewGame(){
  stopTimer();
  const diff = difficultySel.value;
  // generate puzzle (time-consuming but ok for client)
  newGameBtn.disabled = true;
  newGameBtn.textContent = "Generating...";
  // generate puzzle using Sudoku.generatePuzzle
  const fullObj = Sudoku.generatePuzzle(diff);
  boardAPI = Sudoku.renderBoard(fullObj);
  currentGame = { difficulty: diff, solution: fullObj.solution, puzzle: fullObj.puzzle };
  startTime = Date.now();
  startTimer();
  await loadLeaderboard();
  newGameBtn.disabled = false;
  newGameBtn.textContent = "New Game";
}

function startTimer(){
  timerEl.textContent = "Time: 0s";
  timerInterval = setInterval(()=>{
    if(startTime) timerEl.textContent = `Time: ${Math.floor((Date.now()-startTime)/1000)}s`;
  }, 1000);
}

function stopTimer(){ startTime=null; if(timerInterval) { clearInterval(timerInterval); timerInterval=null } }

checkBtn.addEventListener("click", async ()=>{
  if(!currentUser) return alert("Please sign in with Google before submitting a score.");
  if(!boardAPI) return alert("Start a game first.");
  const userGrid = boardAPI.getUserGrid();
  const {complete, conflicts} = Sudoku.validateUserGrid(userGrid);
  if(!complete){
    alert("Puzzle not complete or contains conflicts. Fix mistakes (they're highlighted) before submitting.");
    return;
  }
  const timeSec = Math.floor((Date.now()-startTime)/1000);
  // upload to Firestore
  try{
    await addDoc(collection(db, "scores"), {
      uid: currentUser.uid,
      name: currentUser.displayName || "Anonymous",
      time: timeSec,
      difficulty: currentGame.difficulty,
      timestamp: Date.now()
    });
    alert("Score submitted! Good job 🎉");
    startNewGame();
  } catch(err){
    console.error(err);
    alert("Failed to submit score: " + err.message);
  }
});

// load leaderboard for selected difficulty
async function loadLeaderboard(){
  const diff = difficultySel.value;
  leaderboardEl.innerHTML = `<li style="color:var(--muted)">Loading...</li>`;
  try{
    const q = query(
      collection(db, "scores"),
      where("difficulty","==", diff),
      orderBy("time","asc"),
      limit(10)
    );
    const snap = await getDocs(q);
    leaderboardEl.innerHTML = "";
    if(snap.empty){
      leaderboardEl.innerHTML = `<li style="color:var(--muted)">No scores yet for ${diff}</li>`;
      return;
    }
    snap.forEach(doc => {
      const d = doc.data();
      const li = document.createElement("li");
      li.textContent = `${d.name} — ${d.time}s`;
      leaderboardEl.appendChild(li);
    });
  } catch(err){
    console.error(err);
    leaderboardEl.innerHTML = `<li style="color:var(--wrong)">Failed to load leaderboard</li>`;
  }
}

// reload leaderboard when difficulty changes
difficultySel.addEventListener("change", loadLeaderboard);

// start initial game automatically
startNewGame();
