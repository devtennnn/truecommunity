import './style.css'
import { createIcons, icons } from 'lucide'
import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore'

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCFDt-CUNFLFbThoBKfHfc6k-L5vZNjeTk",
  authDomain: "truecommunity-639bf.firebaseapp.com",
  projectId: "truecommunity-639bf",
  storageBucket: "truecommunity-639bf.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const ADMIN_UID = "NeAapsMHHMSZ0yFdDataAEr0WLr1"

// --- LESSON DATA ---
const DEFAULT_LESSONS = [
  { id: 'foundation-1', title: 'Forex Foundations', desc: 'Master the absolute basics of the Forex market.', type: 'free', badge: 'Beginner', duration: '45 mins', lessonCount: 8, icon: 'book', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', lessons: ['What is Forex?', 'Pips, Lots, and Leverage', 'Choosing a Broker'] },
  { id: 'psych-1', title: 'Trading Psychology', desc: 'Control your emotions and conquer the market.', type: 'free', badge: 'Special', duration: '1.5 hours', lessonCount: 12, icon: 'brain', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', lessons: ['Overcoming FOMO', 'The Power of Discipline', 'Trading Journal Secrets'] },
  { id: 'price-action-1', title: 'Price Action Mastery', desc: 'Technical analysis without the noise.', type: 'paid', badge: 'Intermediate', duration: '3 hours', lessonCount: 15, icon: 'trending-up', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', lessons: ['Market Structure Shift', 'Trendline Liquidity', 'High Probability Zones'] },
  { id: 'smc-1', title: 'Smart Money Concepts', desc: 'Trade like the institutions.', type: 'paid', badge: 'Advanced', duration: '5 hours', lessonCount: 22, icon: 'zap', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', lessons: ['Institutional Order Blocks', 'Inducement vs Break', 'Liquidity Sweeps'] }
];

// --- INITIALIZATION ---
createIcons({ icons })
const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = new Date().getFullYear().toString()

// --- MOBILE MENU ---
const menuToggle = document.getElementById('menu-toggle')
const nav = document.querySelector('.nav')

if (menuToggle && nav) {
  menuToggle.onclick = () => {
    nav.classList.toggle('active')
    const icon = menuToggle.querySelector('i')
    if (icon) {
      const isMenu = icon.getAttribute('data-lucide') === 'menu'
      icon.setAttribute('data-lucide', isMenu ? 'x' : 'menu')
      createIcons({ icons })
    }
  }

  // Close menu when clicking a link
  nav.querySelectorAll('a').forEach(link => {
    link.onclick = () => nav.classList.remove('active')
  })
}

// --- UI STATE ---
let isSignUp = false
let unsubscribeUser: (() => void) | null = null
let unsubscribeSignals: (() => void) | null = null
let unsubscribeJournal: (() => void) | null = null

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, async (user) => {
  const authOnlyLinks = document.querySelectorAll('.auth-only')
  const adminOnlyLinks = document.querySelectorAll('.admin-only')
  const vipOnlyLinks = document.querySelectorAll('.vip-only')
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement

  if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }

  if (user) {
    const isAdmin = user.uid === ADMIN_UID
    if (loginBtn) {
      loginBtn.innerHTML = '<i data-lucide="log-out"></i> Logout'
      createIcons({ icons })
      loginBtn.classList.replace('btn-primary', 'btn-outline')
      loginBtn.onclick = () => signOut(auth)
    }
    
    authOnlyLinks.forEach(link => (link as HTMLElement).style.display = 'block')
    if (isAdmin) adminOnlyLinks.forEach(link => (link as HTMLElement).style.display = 'block')

    const userDocRef = doc(db, 'users', user.uid)
    unsubscribeUser = onSnapshot(userDocRef, async (snapshot) => {
      let userData = snapshot.data()
      if (!snapshot.exists()) {
        userData = { email: user.email, displayName: user.displayName || 'Trader', role: isAdmin ? 'admin' : 'free', createdAt: Timestamp.now() }
        await setDoc(userDocRef, userData)
      }

      const isVIP = !!(userData?.role === 'vip' || userData?.role === 'admin' || isAdmin)
      const path = window.location.pathname

      if (isVIP) {
        vipOnlyLinks.forEach(link => (link as HTMLElement).style.display = 'block')
      } else {
        vipOnlyLinks.forEach(link => (link as HTMLElement).style.display = 'none')
      }

      if (path.includes('settings')) { handleSettingsPage(user, userData) }
      if (path.includes('signals')) { handleSignalsPage(isVIP) }
      if (path.includes('lessons')) { handleLessonsPage(isVIP) }
      if (path.includes('admin')) { handleAdminPage(user) }
      if (path.includes('journal')) { 
        if (isVIP) handleJournalPage(user)
        else window.location.href = 'vip.html'
      }
    })
  } else {
    handleGuestState()
  }
})

function handleGuestState() {
  const loginBtn = document.getElementById('login-btn')
  if (loginBtn) {
    loginBtn.innerHTML = '<i data-lucide="user"></i> Login'
    createIcons({ icons })
    loginBtn.classList.replace('btn-outline', 'btn-primary')
    loginBtn.onclick = openModal
  }
  document.querySelectorAll('.auth-only').forEach(l => (l as HTMLElement).style.display = 'none')
  document.querySelectorAll('.admin-only').forEach(l => (l as HTMLElement).style.display = 'none')
  document.querySelectorAll('.vip-only').forEach(l => (l as HTMLElement).style.display = 'none')
  if (window.location.pathname.includes('settings') || window.location.pathname.includes('admin') || window.location.pathname.includes('journal')) window.location.href = 'index.html'
  if (window.location.pathname.includes('signals')) handleSignalsPage(false)
  if (window.location.pathname.includes('lessons')) handleLessonsPage(false)
}

// --- JOURNAL PAGE LOGIC ---
async function handleJournalPage(user: User) {
  const form = document.getElementById('journal-form') as HTMLFormElement
  const list = document.getElementById('journal-list')
  if (!list) return

  if (unsubscribeJournal) unsubscribeJournal()

  // Real-time listener for user's journal
  const q = query(collection(db, 'journals'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
  unsubscribeJournal = onSnapshot(q, (snapshot) => {
    list.innerHTML = ''
    let totalTrades = 0
    let wins = 0
    let totalPips = 0

    snapshot.forEach((docSnap) => {
      const trade = docSnap.data()
      totalTrades++
      if (trade.result === 'win') wins++
      totalPips += Number(trade.pips)

      const row = document.createElement('tr')
      row.innerHTML = `
        <td>${formatDate(trade.createdAt)}</td>
        <td><strong>${trade.pair}</strong></td>
        <td><span class="type ${trade.type}">${trade.type.toUpperCase()}</span></td>
        <td class="${trade.pips >= 0 ? 'success' : 'danger'}">${trade.pips > 0 ? '+' : ''}${trade.pips}</td>
        <td><span class="trade-result-badge ${trade.result}">${trade.result.toUpperCase()}</span></td>
        <td><button class="btn btn-small btn-delete" data-id="${docSnap.id}"><i data-lucide="trash-2"></i></button></td>
      `
      list.appendChild(row)
    })

    // Update stats
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0
    const totalTradesEl = document.getElementById('stat-total-trades')
    const winRateEl = document.getElementById('stat-win-rate')
    const netPipsEl = document.getElementById('stat-net-pips')

    if (totalTradesEl) totalTradesEl.textContent = totalTrades.toString()
    if (winRateEl) winRateEl.textContent = `${winRate}%`
    if (netPipsEl) {
      netPipsEl.textContent = `${totalPips > 0 ? '+' : ''}${totalPips}`
      netPipsEl.className = `value ${totalPips >= 0 ? 'success' : 'danger'}`
    }

    createIcons({ icons })

    // Handle delete buttons
    list.querySelectorAll('.btn-delete').forEach(btn => {
      (btn as HTMLButtonElement).onclick = async () => {
        if (confirm('Delete this trade from your journal?')) {
          await deleteDoc(doc(db, 'journals', (btn as HTMLButtonElement).dataset.id!))
          showToast('Trade deleted.')
        }
      }
    })
  })

  // Handle form submission
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault()
      const pair = (document.getElementById('trade-pair') as HTMLInputElement).value
      const type = (document.getElementById('trade-type') as HTMLSelectElement).value
      const entry = (document.getElementById('trade-entry') as HTMLInputElement).value
      const exit = (document.getElementById('trade-exit') as HTMLInputElement).value
      const pips = (document.getElementById('trade-pips') as HTMLInputElement).value
      const result = (document.getElementById('trade-result') as HTMLSelectElement).value
      const notes = (document.getElementById('trade-notes') as HTMLTextAreaElement).value

      try {
        await addDoc(collection(db, 'journals'), {
          userId: user.uid,
          pair, type, entry, exit, pips: Number(pips), result, notes,
          createdAt: Timestamp.now()
        })
        form.reset()
        showToast('Trade logged successfully!')
      } catch (err: any) { showToast(err.message, 'error') }
    }
  }
}

function formatDate(timestamp: any) {
  if (!timestamp) return '---'
  const date = timestamp.toDate()
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// --- SIGNALS PAGE LOGIC ---
async function handleSignalsPage(isVIP: boolean) {
  const grid = document.getElementById('signals-grid')
  if (!grid) return

  if (unsubscribeSignals) unsubscribeSignals()

  const q = query(collection(db, 'signals'), orderBy('createdAt', 'desc'))
  unsubscribeSignals = onSnapshot(q, (snapshot) => {
    grid.innerHTML = ''
    if (snapshot.empty) {
      grid.innerHTML = '<div class="glass-card" style="padding: 40px; text-align: center; grid-column: 1/-1;">No live signals at the moment. Check back later!</div>'
      return
    }

    snapshot.forEach((doc) => {
      const sig = doc.data()
      const isLocked = sig.access === 'vip' && !isVIP
      const card = document.createElement('div')
      card.className = `signal-card glass-card fade-in ${sig.access === 'vip' ? 'premium-signal' : ''}`
      
      card.innerHTML = `
        <div class="signal-header">
          <div class="pair">${sig.pair}</div>
          <div class="badge ${sig.access}">${sig.access.toUpperCase()}</div>
        </div>
        <div class="signal-body ${isLocked ? 'locked' : ''}">
          <div class="signal-row"><span>Type:</span> <span class="type ${sig.type.includes('buy') ? 'buy' : 'sell'}">${sig.type.toUpperCase()}</span></div>
          <div class="blur-content">
            <div class="signal-row"><span>Entry:</span> <strong>${sig.entry}</strong></div>
            <div class="signal-row"><span>SL:</span> <strong class="danger">${sig.sl}</strong></div>
            <div class="signal-row"><span>TP:</span> <strong class="success">${sig.tp}</strong></div>
          </div>
          ${isLocked ? `<div class="lock-overlay"><i data-lucide="lock"></i><p>Unlock with VIP Membership</p><a href="vip.html" class="btn btn-primary btn-small">Join VIP</a></div>` : ''}
        </div>
        <div class="signal-footer">
          <span class="time">${formatTime(sig.createdAt)}</span>
          <span class="status-processing">● IN PROCESSING</span>
        </div>
      `
      grid.appendChild(card)
    })
    createIcons({ icons })
  })
}

function formatTime(timestamp: any) {
  if (!timestamp) return 'Just now'
  const date = timestamp.toDate()
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// --- LESSONS PAGE LOGIC ---
function handleLessonsPage(isVIP: boolean) {
  const grid = document.getElementById('lessons-grid');
  if (!grid) return;

  grid.innerHTML = '';
  DEFAULT_LESSONS.forEach(course => {
    const isLocked = course.type === 'paid' && !isVIP;
    const card = document.createElement('div');
    card.className = `course-card glass-card ${course.type === 'paid' ? 'paid-course' : 'free-course'}`;
    card.dataset.type = course.type;

    card.innerHTML = `
      <div class="course-header">
         <div class="course-badge">${course.badge}</div>
         <div class="price-tag ${course.type}">${course.type === 'free' ? 'FREE' : 'VIP ONLY'}</div>
         <i data-lucide="${course.icon}"></i>
      </div>
      <div class="course-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.7rem; color: var(--primary-color); font-weight: 800;">${course.lessonCount} LESSONS</span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${course.duration}</span>
        </div>
        <h3>${course.title}</h3>
        <p>${course.desc}</p>
        <ul class="lesson-list">
          ${course.lessons.map(l => `<li><i data-lucide="${isLocked ? 'lock' : 'play-circle'}"></i> ${l}</li>`).join('')}
        </ul>
        ${isLocked 
          ? `<a href="vip.html" class="btn btn-primary full-width">Unlock Premium Access</a>`
          : `<button class="btn btn-outline full-width start-course-btn" data-id="${course.id}">Start Learning</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  });

  createIcons({ icons });

  document.querySelectorAll('.start-course-btn').forEach(btn => {
    (btn as HTMLButtonElement).onclick = () => {
      const courseId = (btn as HTMLButtonElement).dataset.id;
      const course = DEFAULT_LESSONS.find(c => c.id === courseId);
      if (course) openVideoPlayer(course);
    };
  });
}

function openVideoPlayer(course: any) {
  const modal = document.getElementById('video-modal');
  const title = document.getElementById('video-title');
  const desc = document.getElementById('video-desc');
  const container = document.getElementById('video-container');
  if (modal && title && desc && container) {
    title.textContent = course.title;
    desc.textContent = course.desc;
    container.innerHTML = `<iframe src="${course.videoUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    modal.classList.add('active');
  }
}

const closeVideoBtn = document.getElementById('close-video');
if (closeVideoBtn) {
  closeVideoBtn.onclick = () => {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('video-container');
    if (modal) modal.classList.remove('active');
    if (container) container.innerHTML = ''; 
  };
}

// --- ADMIN PAGE LOGIC ---
let isAdminLogicInitialized = false;

function handleAdminPage(user: User) {
  if (user.uid !== ADMIN_UID) return

  // Static setups
  fetchAdminStats();
  setupSignalManager();
  
  // Setup interactive listeners only once
  if (!isAdminLogicInitialized) {
    setupAdminTabs();
    setupBroadcastManager();
    setupUserManagement();
    isAdminLogicInitialized = true;
  }
}

function setupUserManagement() {
  // User Management
  const lookupBtn = document.getElementById('lookup-user-btn')
  const targetUidInput = document.getElementById('target-uid') as HTMLInputElement
  const userDetailsArea = document.getElementById('user-details-area')
  const adminStatus = document.getElementById('admin-status')
  
  const foundName = document.getElementById('found-name')
  const foundEmail = document.getElementById('found-email')
  const foundRole = document.getElementById('found-role')
  const userRoleSelect = document.getElementById('user-role') as HTMLSelectElement

  if (lookupBtn && targetUidInput) {
    lookupBtn.onclick = async () => {
      const uid = targetUidInput.value.trim()
      if (!uid) return
      if (adminStatus) adminStatus.textContent = 'IN PROCESSING...'
      try {
        const docSnap = await getDoc(doc(db, 'users', uid))
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (userDetailsArea) userDetailsArea.style.display = 'block'
          if (foundName) foundName.textContent = data.displayName || 'No name'
          if (foundEmail) foundEmail.textContent = data.email || 'No email'
          if (foundRole) { 
            foundRole.textContent = data.role.toUpperCase(); 
            foundRole.className = `badge ${data.role}`;
          }
          if (userRoleSelect) userRoleSelect.value = data.role
          if (adminStatus) adminStatus.textContent = 'User found.'
        } else {
          if (adminStatus) adminStatus.textContent = 'User not found.'
        }
      } catch (e: any) { if (adminStatus) adminStatus.textContent = e.message }
    }
  }

  const adminForm = document.getElementById('admin-user-form') as HTMLFormElement
  if (adminForm) {
    adminForm.onsubmit = async (e) => {
      e.preventDefault()
      const role = userRoleSelect.value
      const uid = targetUidInput.value.trim()
      if (adminStatus) adminStatus.textContent = 'IN PROCESSING...'
      try {
        await setDoc(doc(db, 'users', uid), { role, updatedAt: Timestamp.now() }, { merge: true })
        if (adminStatus) adminStatus.textContent = 'Updated successfully!'
        fetchAdminStats(); // Refresh counts
      } catch (e: any) { if (adminStatus) adminStatus.textContent = e.message }
    }
  }

  const quickNewSignal = document.getElementById('quick-new-signal');
  if (quickNewSignal) {
    quickNewSignal.onclick = () => {
      const sigTab = document.querySelector('[data-section="signals"]') as HTMLElement;
      if (sigTab) sigTab.click();
    };
  }

  const quickBroadcast = document.getElementById('quick-broadcast');
  if (quickBroadcast) {
    quickBroadcast.onclick = () => {
      const broadcastTab = document.querySelector('[data-section="broadcast"]') as HTMLElement;
      if (broadcastTab) broadcastTab.click();
    };
  }

  const newSignalForm = document.getElementById('new-signal-form') as HTMLFormElement
  if (newSignalForm) {
    newSignalForm.onsubmit = async (e) => {
      e.preventDefault()
      const pair = (document.getElementById('sig-pair') as HTMLInputElement).value
      const type = (document.getElementById('sig-type') as HTMLSelectElement).value
      const entry = (document.getElementById('sig-entry') as HTMLInputElement).value
      const sl = (document.getElementById('sig-sl') as HTMLInputElement).value
      const tp = (document.getElementById('sig-tp') as HTMLInputElement).value
      const access = (document.getElementById('sig-access') as HTMLSelectElement).value
      
      try {
        await addDoc(collection(db, 'signals'), { pair, type, entry, sl, tp, access, createdAt: Timestamp.now(), status: 'active' })
        showToast('Signal published to database!'); 

        // Also send to Telegram
        const tokenInput = document.getElementById('bot-token') as HTMLInputElement
        const channelInput = document.getElementById('target-channel-id') as HTMLInputElement
        const groupInput = document.getElementById('target-group-id') as HTMLInputElement
        const channelCheck = document.getElementById('send-to-channel') as HTMLInputElement
        const groupCheck = document.getElementById('send-to-group') as HTMLInputElement

        const token = tokenInput?.value.trim()
        const targets = []
        if (channelCheck?.checked) targets.push(channelInput?.value.trim() || '-1003714015291')
        if (groupCheck?.checked) targets.push(groupInput?.value.trim() || '-1003862113933')

        if (token && targets.length > 0) {
          const emoji = type.includes('buy') ? '🔵' : '🔴'
          const message = `
${emoji} <b>NEW SIGNAL: ${pair}</b> ${emoji}
━━━━━━━━━━━━━━━━━━
<b>ACTION:</b> ${type.toUpperCase()}
<b>ENTRY:</b> ${entry}
<b>STOP LOSS:</b> ${sl}
<b>TAKE PROFIT:</b> ${tp}
<b>ACCESS:</b> ${access.toUpperCase()}
━━━━━━━━━━━━━━━━━━
<i>Sent from TRUE CLUB Admin</i>`

          for (const chatId of targets) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: message,
                  parse_mode: 'HTML'
                })
              })
            } catch (err) {
              console.error(`Error sending signal to Telegram (${chatId}):`, err)
            }
          }
          showToast(`Signal broadcasted to ${targets.length} targets!`);
        }

        newSignalForm.reset();
      } catch (err: any) { showToast('Error: ' + err.message, 'error') }
    }
  }
}

function setupAdminTabs() {
  const tabs = document.querySelectorAll('.admin-nav-btn');
  const panes = document.querySelectorAll('.admin-pane');
  tabs.forEach(tab => {
    (tab as HTMLElement).onclick = () => {
      const section = (tab as HTMLElement).dataset.section;
      if (!section) return;
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`section-${section}`)?.classList.add('active');
      createIcons({ icons })
    }
  })
}

async function fetchAdminStats() {
  const totalUsersEl = document.getElementById('stat-total-users');
  const vipUsersEl = document.getElementById('stat-vip-users');
  const activeSigsEl = document.getElementById('stat-active-signals');

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const vipSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'vip')));
    const signalsSnap = await getDocs(collection(db, 'signals'));

    if (totalUsersEl) totalUsersEl.textContent = usersSnap.size.toString();
    if (vipUsersEl) vipUsersEl.textContent = vipSnap.size.toString();
    if (activeSigsEl) activeSigsEl.textContent = signalsSnap.size.toString();
  } catch (e) { console.error("Stats error:", e); }
}

function setupSignalManager() {
  const list = document.getElementById('admin-signals-list');
  if (!list) return;

  const q = query(collection(db, 'signals'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    list.innerHTML = '';
    if (snapshot.empty) {
      list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No signals found.</p>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const sig = docSnap.data();
      const item = document.createElement('div');
      item.className = 'signal-manager-item';
      item.innerHTML = `
        <div class="signal-info-brief">
          <div class="sig-pair-small">${sig.pair}</div>
          <div class="sig-type-small ${sig.type}">${sig.type.toUpperCase()}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${sig.access.toUpperCase()}</div>
        </div>
        <button class="action-btn delete" data-id="${docSnap.id}"><i data-lucide="trash-2"></i></button>
      `;
      list.appendChild(item);
    });
    createIcons({ icons });

    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      (btn as HTMLButtonElement).onclick = async () => {
        if (confirm("Delete this signal?")) {
          await deleteDoc(doc(db, 'signals', (btn as HTMLButtonElement).dataset.id!));
        }
      }
    });
  });
}

function setupBroadcastManager() {
  const form = document.getElementById('broadcast-form') as HTMLFormElement
  if (!form) return

  const messageTextarea = document.getElementById('broadcast-message') as HTMLTextAreaElement
  const charCountBadge = document.getElementById('char-count')
  
  // Character counter logic
  if (messageTextarea && charCountBadge) {
    const updateCharCount = () => {
      const len = messageTextarea.value.length
      charCountBadge.textContent = `${len} / 4096`
      charCountBadge.classList.toggle('limit-near', len > 3500)
      charCountBadge.classList.toggle('limit-exceeded', len > 4096)
    }
    messageTextarea.oninput = updateCharCount
    updateCharCount()
  }

  // Textarea glow animation
  const wrapper = messageTextarea.parentElement
  if (wrapper) {
    wrapper.onmousemove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      wrapper.style.setProperty('--x', `${x}px`)
      wrapper.style.setProperty('--y', `${y}px`)
    }
  }

  // Verify functionality
  document.querySelectorAll('.verify-target').forEach(btn => {
    (btn as HTMLButtonElement).onclick = async () => {
      const type = (btn as HTMLElement).dataset.target
      const inputId = `target-${type}-id`
      const chatId = (document.getElementById(inputId) as HTMLInputElement).value.trim()
      const token = (document.getElementById('bot-token') as HTMLInputElement).value.trim()

      if (!chatId || !token) {
        showToast('Chat ID and Bot Token required for verification.', 'error')
        return
      }

      showToast(`Verifying ${type}...`)
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`)
        const data = await res.json()
        if (data.ok) {
          showToast(`Verified! Found ${data.result.type}: ${data.result.title || data.result.username || chatId}`)
        } else {
          showToast(`Verification failed: ${data.description}`, 'error')
        }
      } catch (err: any) {
        showToast(`Verification error: ${err.message}`, 'error')
      }
    }
  })

  // Media Toggle logic
  let activeMediaType: 'url' | 'upload' = 'url'
  const toggleBtns = document.querySelectorAll('.media-toggle .btn-toggle')
  const panes = document.querySelectorAll('.media-input-pane')
  
  toggleBtns.forEach(btn => {
    (btn as HTMLElement).onclick = () => {
      activeMediaType = (btn as HTMLElement).dataset.type as any
      toggleBtns.forEach(b => b.classList.remove('active'))
      panes.forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById(`media-${activeMediaType}-input`)?.classList.add('active')
    }
  })

  // File input display logic
  const fileInput = document.getElementById('broadcast-image-file') as HTMLInputElement
  const fileNameDisplay = document.getElementById('file-name-display')
  if (fileInput && fileNameDisplay) {
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files[0]) {
        fileNameDisplay.textContent = fileInput.files[0].name
      } else {
        fileNameDisplay.textContent = 'Choose image file...'
      }
    }
  }

  form.onsubmit = async (e) => {
    e.preventDefault()
    const message = (document.getElementById('broadcast-message') as HTMLTextAreaElement).value.trim()
    const token = (document.getElementById('bot-token') as HTMLInputElement).value.trim()
    const imageUrl = (document.getElementById('broadcast-image-url') as HTMLInputElement).value.trim()
    const imageFile = (document.getElementById('broadcast-image-file') as HTMLInputElement).files?.[0]

    const channelInput = document.getElementById('target-channel-id') as HTMLInputElement
    const groupInput = document.getElementById('target-group-id') as HTMLInputElement
    const channelCheck = document.getElementById('send-to-channel') as HTMLInputElement
    const groupCheck = document.getElementById('send-to-group') as HTMLInputElement

    const targets = []
    if (channelCheck?.checked) targets.push(channelInput?.value.trim() || '-1003714015291')
    if (groupCheck?.checked) targets.push(groupInput?.value.trim() || '-1003862113933')

    if (!message || !token) {      showToast('Message and Bot Token are required.', 'error')
      return
    }

    if (targets.length === 0) {
      showToast('Please select at least one target (Channel or Group).', 'error')
      return
    }

    showToast('Sending broadcast...')
    let successCount = 0
    let lastError = ''

    for (const chatId of targets) {
      try {
        const hasImageUrl = activeMediaType === 'url' && imageUrl.length > 0
        const hasImageUpload = activeMediaType === 'upload' && !!imageFile
        
        let method = 'sendMessage'
        let response;

        if (hasImageUpload && imageFile) {
          method = 'sendPhoto'
          const formData = new FormData()
          formData.append('chat_id', chatId)
          formData.append('photo', imageFile)
          formData.append('caption', message)
          formData.append('parse_mode', 'HTML')
          
          response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            body: formData
          })
        } else if (hasImageUrl) {
          method = 'sendPhoto'
          const body = {
            chat_id: chatId,
            photo: imageUrl,
            caption: message,
            parse_mode: 'HTML'
          }
          response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
        } else {
          method = 'sendMessage'
          const body = {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          }
          response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
        }
        
        const result = await response.json()
        if (response.ok) {
          successCount++
        } else {
          lastError = result.description || 'Unknown error'
          console.error(`Telegram Error (${chatId}):`, result)
        }
      } catch (err: any) { 
        console.error(`Network Error sending to ${chatId}:`, err)
        lastError = err.message
      }
    }

    if (successCount === targets.length) {
      showToast(`Broadcast sent to all ${successCount} targets!`)
      form.reset()
      if (fileNameDisplay) fileNameDisplay.textContent = 'Choose image file...'
    } else if (successCount > 0) {
      showToast(`Sent to ${successCount}/${targets.length} targets. Error: ${lastError}`, 'error')
    } else {
      showToast(`Broadcast failed: ${lastError}`, 'error')
    }
  }
}

// --- TOAST NOTIFICATION ---
function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast toast-${type} fade-in`
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
    <span>${message}</span>
  `
  document.body.appendChild(toast)
  createIcons({ icons })
  
  setTimeout(() => {
    toast.classList.replace('fade-in', 'fade-out')
    setTimeout(() => toast.remove(), 400)
  }, 3000)
}

// --- SETTINGS PAGE LOGIC ---
function handleSettingsPage(user: User, userData: any) {
  const uidInput = document.getElementById('user-id') as HTMLInputElement
  const emailInput = document.getElementById('profile-email') as HTMLInputElement
  const summaryName = document.getElementById('summary-name')
  const summaryEmail = document.getElementById('summary-email')
  const displayNameInput = document.getElementById('display-name') as HTMLInputElement
  const tgInput = document.getElementById('telegram-handle') as HTMLInputElement

  if (uidInput) uidInput.value = user.uid
  if (emailInput) emailInput.value = user.email || ''
  const name = userData?.displayName || user.displayName || 'Trader'
  if (summaryName) summaryName.textContent = `Welcome back, ${name}!`
  if (summaryEmail) summaryEmail.textContent = user.email || 'No email connected'
  if (displayNameInput) displayNameInput.value = name
  if (tgInput && userData?.telegram) tgInput.value = userData.telegram

  setupSettingsTabs()
  setupSettingsForms(user)
  setupCopyButton(user.uid)
  updateMembershipBadges(user, userData)
}

function updateMembershipBadges(user: User, userData: any) {
  const isVIP = userData?.role === 'vip' || userData?.role === 'admin' || user.uid === ADMIN_UID
  const statusBadge = document.getElementById('status-badge')
  const headerStatusBadge = document.getElementById('header-status-badge')
  const upgradeBtn = document.getElementById('upgrade-btn')
  const expiryDisplay = document.getElementById('expiry-display')

  if (statusBadge) { statusBadge.textContent = isVIP ? 'VIP MEMBER' : 'FREE MEMBER'; statusBadge.className = `badge ${isVIP ? 'vip' : 'free'}` }
  if (headerStatusBadge) { headerStatusBadge.textContent = isVIP ? 'VIP' : 'FREE'; headerStatusBadge.className = `badge ${isVIP ? 'vip' : 'free'}` }
  if (upgradeBtn) upgradeBtn.style.display = isVIP ? 'none' : 'inline-flex'

  if (expiryDisplay) {
    if (isVIP) {
      if (user.uid === ADMIN_UID || userData?.role === 'admin') {
        expiryDisplay.textContent = 'Lifetime Admin Access'
      } else if (userData?.expiredAt) {
        const expiryDate = userData.expiredAt.toDate()
        expiryDisplay.textContent = `Expires on: ${expiryDate.toLocaleDateString()}`
      } else {
        expiryDisplay.textContent = 'Active Subscription'
      }
    } else {
      expiryDisplay.textContent = 'No active VIP plan'
    }
  }
}

function setupSettingsTabs() {
  const tabs = document.querySelectorAll('.side-tab')
  tabs.forEach(tab => {
    (tab as HTMLElement).onclick = () => {
      const section = (tab as HTMLElement).dataset.section
      document.querySelectorAll('.side-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(`section-${section}`)?.classList.add('active')
      createIcons({ icons })
    }
  })
}

function setupSettingsForms(user: User) {
  const profileForm = document.getElementById('profile-form') as HTMLFormElement
  const communityForm = document.getElementById('community-form') as HTMLFormElement
  const resetBtn = document.getElementById('reset-password-btn')
  if (profileForm) {
    profileForm.onsubmit = async (e) => {
      e.preventDefault(); const name = (document.getElementById('display-name') as HTMLInputElement).value
      try { 
        await updateProfile(user, { displayName: name }); 
        await setDoc(doc(db, 'users', user.uid), { displayName: name }, { merge: true }); 
        showToast('Profile updated successfully!')
      } catch (err: any) { 
        showToast(err.message, 'error')
      }
    }
  }
  if (communityForm) {
    communityForm.onsubmit = async (e) => {
      e.preventDefault(); const tg = (document.getElementById('telegram-handle') as HTMLInputElement).value
      try { 
        await setDoc(doc(db, 'users', user.uid), { telegram: tg }, { merge: true }); 
        showToast('Telegram handle saved!')
      } catch (err: any) { 
        showToast(err.message, 'error')
      }
    }
  }
  if (resetBtn) {
    resetBtn.onclick = async () => { 
      if (user.email) { 
        try { 
          await sendPasswordResetEmail(auth, user.email); 
          showToast('Reset email sent to your inbox!')
        } catch (err: any) { 
          showToast(err.message, 'error')
        } 
      } 
    }
  }
}

function setupCopyButton(uid: string) {
  const btn = document.getElementById('copy-uid-btn')
  if (btn) btn.onclick = () => { 
    navigator.clipboard.writeText(uid); 
    showToast('UID copied to clipboard!')
  }
}

// --- AUTH UI ---
function openModal() { document.getElementById('auth-modal')?.classList.add('active') }
function closeModal() { document.getElementById('auth-modal')?.classList.remove('active') }
const closeModalBtn = document.querySelector('.close-modal')
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal)

const authForm = document.getElementById('auth-form') as HTMLFormElement
if (authForm) {
  authForm.onsubmit = async (e) => {
    e.preventDefault(); const email = (document.getElementById('email') as HTMLInputElement).value; const password = (document.getElementById('password') as HTMLInputElement).value
    try {
      if (isSignUp) { const cred = await createUserWithEmailAndPassword(auth, email, password); await setDoc(doc(db, 'users', cred.user.uid), { email, role: 'free', createdAt: Timestamp.now() }) }
      else { await signInWithEmailAndPassword(auth, email, password) }
      closeModal()
    } catch (err: any) { alert(err.message) }
  }
}

const toggleAuth = document.getElementById('toggle-auth')
if (toggleAuth) toggleAuth.onclick = (e) => { e.preventDefault(); isSignUp = !isSignUp; updateAuthUI() }
function updateAuthUI() { const title = document.getElementById('modal-title'); if (title) title.textContent = isSignUp ? 'Join TRUE CLUB' : 'Login to TRUE CLUB' }
