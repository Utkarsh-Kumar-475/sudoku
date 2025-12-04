import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let startTime;
let currentUser;

document.getElementById("googleSignIn").onclick = () => {
  signInWithPopup(auth, provider);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("userInfo").textContent = `Welcome ${user.displayName}`;
  }
});

// Game actions
document.getElementById("newGameBtn").onclick = () => {
  const diff = document.getElementById("difficulty").value;
  const puzzle = Sudoku.generatePuzzle(diff);
  Sudoku.renderBoard(puzzle);
  startTime = Date.now();
  startTimer();
};

document.getElementById("checkBtn").onclick = async () => {
  if (!currentUser) return alert("Sign in first!");

  const grid = Sudoku.getUserGrid();
  if (!Sudoku.isValidSudoku(grid)) {
    alert("Puzzle incomplete!");
    return;
  }

  const score = Math.floor((Date.now() - startTime) / 1000);
  await addDoc(collection(db, "scores"), {
    uid: currentUser.uid,
    name: currentUser.displayName,
    time: score,
    timestamp: Date.now()
  });

  alert("Score submitted!");
  loadLeaderboard();
};

async function loadLeaderboard() {
  const q = query(collection(db, "scores"), orderBy("time"), limit(10));
  const snap = await getDocs(q);
  const list = document.getElementById("leaderboard");
  list.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const li = document.createElement("li");
    li.textContent = `${d.name}: ${d.time}s`;
    list.appendChild(li);
  });
}

// Timer
function startTimer() {
  const t = document.getElementById("timer");
  setInterval(() => {
    if (startTime) {
      t.textContent = "Time: " + Math.floor((Date.now() - startTime) / 1000) + "s";
    }
  }, 1000);
}

loadLeaderboard();
