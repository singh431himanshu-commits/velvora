// 1. Firebase Initialization (मैक्सी भाई की असली डिटेल्स)
const firebaseConfig = { 
  apiKey: "AIzaSyCUVM7Qt11vselCetcnc3wk3Y73RQOemlI", 
  authDomain: "velvora-5737c.firebaseapp.com", 
  projectId: "velvora-5737c", 
  storageBucket: "velvora-5737c.firebasestorage.app", 
  messagingSenderId: "945792570282", 
  appId: "1:945792570282:web:5217a50aa347ca1bd311d319e", 
  measurementId: "G-P0F5B0EFT1" 
}; 

if (!firebase.apps.length) { 
  firebase.initializeApp(firebaseConfig); 
} 

const SUPABASE_URL = "https://tkllbmlcsrcxdwpbbleb.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_CHZd1TBq8DzM-ZUfgQJpOA_Ukjmiv6V"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); 

let cart = []; 
let wishlist = JSON.parse(localStorage.getItem('velvora_wishlist')) || []; 
let selectedSize = null; 
let selectedColor = null; 
let currentProductPhotos = []; 
let globalCachedProducts = []; 
let currentUser = null; 

// DOMContentLoaded इवेंट
window.addEventListener('DOMContentLoaded', async () => { 
    switchTab('desc'); 
    initSearchEngine(); 
    setupAuthObserver(); 
    startBannerSlider(); // ⚡ बैनर स्लाइडर एक्टिवेट किया
    await fetchLiveProducts(); 
    
    if (!history.state || history.state.page !== 'home') {
        history.replaceState({ page: 'home' }, '', window.location.pathname);
    }
}); 

window.addEventListener('popstate', (event) => {
    showHomepage();
    history.pushState({ page: 'home' }, '', window.location.pathname);
});

// ⚡ ऑटो-स्लाइडिंग लक्ज़री बैनर स्लाइडर लॉजिक (5 सेकंड टाइमर)
let currentSlideIndex = 0;
function startBannerSlider() {
    const container = document.getElementById('slider-container');
    if (!container) return;
    setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % 4;
        container.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }, 5000);
}

// Supabase से लाइव प्रोडक्ट्स डाउनलोड करने और शफल करने का फ़ंक्शन
async function fetchLiveProducts() { 
    const grid = document.getElementById('products-grid'); 
    if(grid) grid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-12 font-bold text-xs">Loading live vault collection...</div>`; 

    const { data: products, error } = await _supabase.from('products').select('*'); 
    if (error) { 
        console.error("Error fetching live products:", error); 
        if(grid) grid.innerHTML = `<div class="col-span-4 text-center text-red-500 py-12 font-bold text-xs">Failed to synchronize catalog stack.</div>`; 
        return; 
    } 

    let mappedProducts = products.map(p => { 
        let imgArray = []; 
        if (p.images) { 
            try { 
                imgArray = typeof p.images === 'string' ? JSON.parse(p.images) : p.images; 
            } catch(e) { 
                imgArray = [p.images]; 
            } 
        } 
        return { 
            id: p.id, 
            brand: p.brand || '', 
            name: p.name || '', 
            category: p.category || '', 
            stockStatus: p.stockStatus || 'in', 
            price: p.price || '0', 
            images: imgArray, 
            sizes: p.sizes ? p.sizes.split(',').map(s => s.trim()) : [], 
            colors: p.colors ? p.colors.split(',').map(c => c.trim()) : [], 
            sizeChartImg: p.sizeChartImg || '', 
            desc: p.desc || '', 
            reviewsText: p.reviewsText || '' 
        }; 
    }); 

    globalCachedProducts = mappedProducts.sort(() => Math.random() - 0.5);
    renderProducts(getAiSortedProducts(globalCachedProducts)); 
} 

function getProducts() {  
    return globalCachedProducts;  
} 

function showHomepage() {  
    document.getElementById('homepage-view').classList.remove('hidden');  
    document.getElementById('details-view').classList.add('hidden');  
    if (document.getElementById('profile-view')) { 
        document.getElementById('profile-view').classList.add('hidden'); 
    } 
    renderProducts(getAiSortedProducts(getProducts())); 
} 

function toggleDarkMode() { 
    document.documentElement.classList.toggle('dark');
    if(document.documentElement.classList.contains('dark')) {
        localStorage.setItem('velvora_theme', 'dark');
    } else {
        localStorage.setItem('velvora_theme', 'light');
    }
} 

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('translate-x-full'); } 
function closeCheckoutModal() { document.getElementById('checkout-modal').classList.add('hidden'); } 

function filterCategory(brandName) { 
    showHomepage(); 
    let list = getProducts(); 
    if(brandName) { 
        list = list.filter(p => p.brand.toLowerCase() === brandName.toLowerCase() || p.category.toLowerCase() === brandName.toLowerCase()); 
    } 
    renderProducts(getAiSortedProducts(list)); 
} 

function getAiSortedProducts(list) { 
    let interest = JSON.parse(localStorage.getItem('velvora_ai_interest')) || {}; 
    return list.sort((a, b) => { 
        let scoreA = (interest[a.category.toLowerCase()] || 0) + (interest[a.brand.toLowerCase()] || 0); 
        let scoreB = (interest[b.category.toLowerCase()] || 0) + (interest[b.brand.toLowerCase()] || 0); 
        return scoreB - scoreA; 
    }); 
} 

function initSearchEngine() { 
    const searchBox = document.getElementById('search-box'); 
    if (!searchBox) return; 
    searchBox.addEventListener('input', (e) => { 
        const query = e.target.value.toLowerCase().trim(); 
        let allItems = getProducts(); 
        if (query !== '') { 
            allItems = allItems.filter(p => 
                p.name.toLowerCase().includes(query) ||  
                p.brand.toLowerCase().includes(query) ||  
                p.category.toLowerCase().includes(query) 
            ); 
        } 
        renderProducts(getAiSortedProducts(allItems)); 
    }); 
} 

function renderProducts(list) { 
    const grid = document.getElementById('products-grid'); 
    if(!grid) return;  
    grid.innerHTML = ''; 
     
    if(list.length === 0) { 
        grid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-12 font-bold text-xs">No curated items active in this index loop.</div>`; 
        return; 
    } 

    list.forEach(p => { 
        const mImg = p.images && p.images[0] ? p.images[0] : ''; 
        const hImg = p.images && p.images[1] ? p.images[1] : mImg; 
        const rawPrice = p.price ? p.price.toString().replace(/[^\d]/g, '') : '0'; 
         
        grid.innerHTML += `
            <div class="product-card bg-white p-2 border border-gray-100 rounded-lg cursor-pointer dark:bg-[#121212] dark:border-gray-900" onclick="openProduct(${p.id})">
                <div class="aspect-[3/4] rounded-md overflow-hidden mb-1.5 bg-gray-50 dark:bg-[#1a1a1a] relative">
                    <img src="${mImg}" onmouseover="this.src='${hImg}'" onmouseout="this.src='${mImg}'" class="w-full h-full object-cover transition-all duration-500">
                </div>
                <p class="text-[8px] text-red-500 uppercase font-black tracking-widest">${p.brand}</p>
                <h3 class="font-bold text-[11px] truncate text-black dark:text-white">${p.name}</h3>
                <span class="font-black text-black dark:text-white block text-[11px] mt-0.5">₹${parseInt(rawPrice).toLocaleString('en-IN')}</span>
            </div>
        `; 
    }); 
} 

function openProduct(id) { 
    const p = getProducts().find(prod => prod.id == id); 
    if(!p) return; 

    let interest = JSON.parse(localStorage.getItem('velvora_ai_interest')) || {}; 
    interest[p.category.toLowerCase()] = (interest[p.category.toLowerCase()] || 0) + 1; 
    interest[p.brand.toLowerCase()] = (interest[p.brand.toLowerCase()] || 0) + 1; 
    localStorage.setItem('velvora_ai_interest', JSON.stringify(interest)); 

    currentProductPhotos = p.images || []; 
    selectedSize = null;  
    selectedColor = p.colors?.[0] || "Default"; 

    document.getElementById('homepage-view').classList.add('hidden'); 
    if (document.getElementById('profile-view')) { 
        document.getElementById('profile-view').classList.add('hidden'); 
    } 
    document.getElementById('details-view').classList.remove('hidden'); 
     
    document.getElementById('detail-brand').innerText = p.brand; 
    document.getElementById('detail-title').innerText = p.name; 
     
    const rawPrice = p.price ? p.price.toString().replace(/[^\d]/g, '') : '0'; 
    document.getElementById('detail-price').innerText = '₹' + parseInt(rawPrice).toLocaleString('en-IN'); 
     
    const mainImg = document.getElementById('detail-main-img'); 
    mainImg.src = currentProductPhotos[0] || ''; 

    const thumbContainer = document.getElementById('detail-thumbnails'); 
    thumbContainer.innerHTML = ''; 
    currentProductPhotos.forEach((imgUrl, idx) => { 
        if(imgUrl) { 
            const tImg = document.createElement('img'); 
            tImg.src = imgUrl; 
            tImg.className = `w-10 h-14 object-cover rounded border cursor-pointer hover:border-black dark:hover:border-white transition ${idx === 0 ? 'border-black dark:border-white' : 'border-gray-200 dark:border-gray-800'}`; 
            tImg.onclick = () => { 
                mainImg.src = imgUrl; 
                document.querySelectorAll('#detail-thumbnails img').forEach(img => img.className = 'w-10 h-14 object-cover rounded border cursor-pointer border-gray-200 dark:border-gray-800'); 
                tImg.className = 'w-10 h-14 object-cover rounded border cursor-pointer border-black dark:border-white'; 
            }; 
            thumbContainer.appendChild(tImg); 
        } 
    }); 

    const stockBadge = document.getElementById('stock-badge'); 
    if(p.stockStatus === "out") { 
        stockBadge.className = "bg-red-50 text-red-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider"; 
        stockBadge.innerText = "OUT OF ALLOCATION"; 
    } else { 
        stockBadge.className = "bg-gray-100 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider dark:bg-gray-800 dark:text-white"; 
        stockBadge.innerText = "STOCK ALLOCATED"; 
    } 

    const cc = document.getElementById('detail-colors-list'); cc.innerHTML = ''; 
    if(p.colors && p.colors.length > 0) { 
        p.colors.forEach((color, idx) => { 
            const btn = document.createElement('button'); btn.innerText = color; 
            btn.className = "border px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white text-black dark:bg-[#1a1a1a] dark:text-white dark:border-gray-800 transition " + (idx === 0 ? "border-black dark:border-white ring-1 ring-black dark:ring-white" : ""); 
            btn.onclick = () => { 
                selectedColor = color;  
                document.querySelectorAll('#detail-colors-list button').forEach(b => b.className = "border px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white text-black dark:bg-[#1a1a1a] dark:text-white dark:border-gray-800 transition"); 
                btn.className = "border px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white text-black dark:bg-[#1a1a1a] dark:text-white dark:border-gray-800 transition border-black dark:border-white ring-1 ring-black dark:ring-white"; 
            }; 
            cc.appendChild(btn); 
        }); 
    } 

    const sc = document.getElementById('detail-sizes-list'); sc.innerHTML = ''; 
    if(p.sizes && p.sizes.length > 0) { 
        p.sizes.forEach(size => { 
            const btn = document.createElement('button'); btn.innerText = size; 
            btn.className = "w-8 h-8 border rounded-md flex items-center justify-center text-[10px] font-black bg-white text-black dark:bg-[#1a1a1a] dark:text-white dark:border-gray-800 transition"; 
            btn.onclick = () => { 
                selectedSize = size;  
                document.querySelectorAll('#detail-sizes-list button').forEach(b => b.className = "w-8 h-8 border rounded-md flex items-center justify-center text-[10px] font-black bg-white text-black dark:bg-[#1a1a1a] dark:text-white dark:border-gray-800 transition"); 
                btn.className = "w-8 h-8 border rounded-md flex items-center justify-center text-[10px] font-black bg-black text-white dark:bg-white dark:text-black transition"; 
            }; 
            sc.appendChild(btn); 
        }); 
    } 

    window.currentSizeChartImg = p.sizeChartImg || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600"; 

    window.productTabContext = { 
        desc: p.desc || "No narrative injected.", 
        additional: `Material Grid: ${p.colors ? p.colors.join(', ') : 'N/A'} / Size Layer: ${p.sizes ? p.sizes.join(', ') : 'N/A'}`, 
        reviews: p.reviewsText || "⭐ Clean feedback log." 
    }; 
    switchTab('desc'); 

    const suggestionsGrid = document.getElementById('suggestions-grid'); 
    if(suggestionsGrid) { 
        suggestionsGrid.innerHTML = ''; 
        const related = getProducts().filter(prod => prod.id !== p.id && (prod.brand === p.brand || prod.category === p.category)); 
        const aiSortedRelated = getAiSortedProducts(related).slice(0, 4); 
         
        aiSortedRelated.forEach(rp => { 
            suggestionsGrid.innerHTML += `
                <div class="border rounded-lg p-1.5 bg-white cursor-pointer hover:shadow-xs transition dark:bg-[#121212] dark:border-gray-900" onclick="openProduct(${rp.id})">
                    <img src="${rp.images[0]}" class="w-full aspect-[3/4] object-cover rounded mb-1">
                    <h4 class="font-bold text-[10px] truncate text-black dark:text-white">${rp.name}</h4>
                    <span class="text-black dark:text-white font-black text-[9px]">₹${parseInt(rp.price).toLocaleString('en-IN')}</span>
                </div>
            `; 
        }); 
    } 

    document.getElementById('add-to-cart-btn').onclick = () => { 
        if(!selectedSize) return alert("🚨 Please select your Size first!"); 
        if(p.stockStatus === "out") return alert("This drop is out of stock!"); 
        cart.push({ ...p, chosenSize: selectedSize, chosenColor: selectedColor }); 
        updateCart(); 
        alert('Added to Bag! 🛒'); 
    }; 

    document.getElementById('buy-now-btn').onclick = () => { 
        if(!selectedSize) return alert("🚨 Please select your Size first before Instant Checkout!"); 
        if(p.stockStatus === "out") return alert("This drop is out of stock!"); 
        let priceVal = parseInt(rawPrice) || 0; 
        window.checkoutItemDetails = `Brand: [${p.brand}] \nProduct: ${p.name}\nSize: ${selectedSize}\nColor: ${selectedColor}\nPrice Summary: ₹${priceVal}`; 
        openStepCheckout(); 
    }; 

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, 60);
} 

function switchTab(tabName) { 
    document.querySelectorAll('.tab-btn').forEach(btn => btn.className = "tab-btn px-4 py-2.5 border-b-2 border-transparent"); 
    const targetedTab = document.getElementById(`tab-${tabName}`); 
    if(targetedTab) targetedTab.className = "tab-btn px-4 py-2.5 border-b-2 border-black dark:border-white text-black dark:text-white"; 
     
    const contentArea = document.getElementById('tab-content-area'); 
    if(contentArea && window.productTabContext) { 
        contentArea.innerText = window.productTabContext[tabName] || ''; 
    } 
} 

function openSizeChartModal() { 
    document.getElementById('size-chart-img').src = window.currentSizeChartImg; 
    document.getElementById('size-chart-modal').classList.remove('hidden'); 
} 
function closeSizeChartModal() { 
    document.getElementById('size-chart-modal').classList.add('hidden'); 
} 

// ⚡ सुरक्षा ऑब्जर्वर: ईमेल वेरिफिकेशन स्टेटस चेक + एडमिन अकाउंट सिंगल-लॉगिन प्रोटेक्शन
function setupAuthObserver() {
    firebase.auth().onAuthStateChanged(async (user) => {
        const accountSec = document.getElementById('account-section');
        const emailDisp = document.getElementById('user-email-display');
        const navAuthBtn = document.getElementById('user-auth-nav-btn');
        const usernameDisp = document.getElementById('user-username-display');
        const usernameBox = document.getElementById('username-setup-box');
        
        // 🚨 एडमिन सिंगल ईमेल ब्लॉक प्रोटेक्शन
        const ADMIN_EMAIL = "singh431himanshu@gmail.com"; 

        if (user) {
            // चेक करें कि एडमिन ईमेल स्टोर फ्रंट पर लॉगिन न हो सके
            if (user.email === ADMIN_EMAIL) {
                alert("🔒 SECURITY PROTOCOL: यह एडमिन अकाउंट है। कृपया कस्टमर स्टोर पर दूसरा अकाउंट यूज़ करें!");
                firebase.auth().signOut();
                window.location.reload();
                return;
            }

            // ✉️ ईमेल वेरिफिकेशन वेरिफिकेशन सुरक्षा
            if (!user.emailVerified) {
                alert("✉️ EMAIL VERIFICATION: कृपया लॉगिन करने से पहले अपने जीमेल इनबॉक्स में जाकर वेरिफिकेशन लिंक पर क्लिक करें!");
                user.sendEmailVerification().catch(err => console.log("Verification email rate-limit"));
                firebase.auth().signOut();
                window.location.reload();
                return;
            }

            currentUser = user.email;
            if(emailDisp) emailDisp.innerText = `Logged in: ${user.email}`;
            if(navAuthBtn) {
                navAuthBtn.innerHTML = `<i class="fa-solid fa-circle-user text-sm"></i> <span>DASHBOARD</span>`;
                navAuthBtn.onclick = () => {
                    if(accountSec) accountSec.classList.toggle('hidden'); 
                };
            }

            let savedUsername = localStorage.getItem(`username_${user.uid}`);
            if (savedUsername) {
                if(usernameDisp) usernameDisp.innerText = `@${savedUsername}`;
                if(usernameBox) usernameBox.classList.add('hidden');
            } else {
                if(usernameDisp) usernameDisp.innerText = "Not Claimed";
                if(usernameBox) usernameBox.classList.remove('hidden'); 
            }
            
            loadCustomerOrders(user.uid);
        } else {
            currentUser = null;
            if(accountSec) accountSec.classList.add('hidden');
            if(navAuthBtn) {
                navAuthBtn.innerHTML = `<i class="fa-solid fa-lock text-xs"></i> <span>Login</span>`;
                navAuthBtn.onclick = () => openAuthModal();
            }
        }
    });
}

function openAuthModal() { 
    const modal = document.getElementById('checkout-modal'); 
    modal.classList.remove('hidden'); 
    modal.innerHTML = `
        <div class="bg-white max-w-sm w-full p-6 rounded-2xl relative dark:bg-[#121212] text-xs font-bold space-y-4 shadow-xl animate-3d-wave">
            <button onclick="closeCheckoutModal()" class="absolute top-4 right-4 text-sm">✕</button>
            <h3 class="text-sm font-black uppercase border-b pb-2 tracking-wider text-black dark:text-white">👤 CUSTOMER AUTH GATEWAY</h3>
            
            <div class="space-y-3">
                <div>
                    <label class="block mb-1 text-gray-400 uppercase text-[9px]">Email Address</label>
                    <input type="email" id="auth-email-input" placeholder="your@email.com" class="w-full p-2.5 border rounded dark:bg-gray-800 dark:border-gray-700 focus:outline-none">
                </div>
                <div>
                    <label class="block mb-1 text-gray-400 uppercase text-[9px]">Password</label>
                    <input type="password" id="auth-password-input" placeholder="••••••••" class="w-full p-2.5 border rounded dark:bg-gray-800 dark:border-gray-700 focus:outline-none">
                </div>
                
                <div class="flex gap-2 pt-1">
                    <button onclick="handleEmailAuth('signin')" class="w-1/2 bg-black text-white py-2.5 uppercase rounded text-[9px] tracking-wider font-black dark:bg-white dark:text-black">Sign In</button>
                    <button onclick="handleEmailAuth('signup')" class="w-1/2 bg-gray-200 text-black py-2.5 uppercase rounded text-[9px] tracking-wider font-black dark:bg-gray-700 dark:text-white">Sign Up</button>
                </div>
            </div>

            <div class="mt-4 border-t pt-4 dark:border-zinc-800">
                <button type="button" onclick="loginWithGoogle()" class="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-300 text-black font-black py-2 uppercase text-[10px] tracking-widest rounded-xs hover:bg-gray-50 transition shadow-xs">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-4 h-4" alt="Google">
                    <span>Continue with Google</span>
                </button>
            </div>
        </div>
    `; 
} 

async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        alert(`🎉 स्वागत है ${result.user.displayName || 'यूजर'}!`);
        closeCheckoutModal();
        window.location.reload();
    } catch (error) {
        console.error("Google Auth Error:", error);
        alert("गूगल लॉगिन फेल हुआ: " + error.message);
    }
}

// ⚡ यूनिक यूजरनेम सेव करने का फंक्शन
async function saveUniqueUsername() {
    const input = document.getElementById('custom-username-input');
    if(!input || !input.value.trim()) return alert("Please enter a valid username!");
    
    let desiredName = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if(desiredName.length < 3) return alert("Username must be at least 3 characters long!");

    const user = firebase.auth().currentUser;
    if(!user) return alert("No active session found.");

    localStorage.setItem(`username_${user.uid}`, desiredName);
    alert(`🎉 @${desiredName} successfully linked to your profile!`);
    window.location.reload();
}

function handleEmailAuth(type) { 
    const email = document.getElementById('auth-email-input').value.trim(); 
    const password = document.getElementById('auth-password-input').value.trim(); 

    if (!email || !password) { 
        return alert("🚨 कृपया ईमेल और पासवर्ड दोनों दर्ज करें!"); 
    } 

    if (type === 'signup') { 
        firebase.auth().createUserWithEmailAndPassword(email, password) 
            .then((result) => { 
                result.user.sendEmailVerification();
                alert("✉️ वेरिफिकेशन लिंक आपकी ईमेल पर भेज दिया गया है, कृपया वेरिफाई करें!");
                closeCheckoutModal(); 
            }) 
            .catch((error) => { alert("❌ साइन-अप में समस्या: " + error.message); }); 
    } else { 
        firebase.auth().signInWithEmailAndPassword(email, password) 
            .then((result) => { closeCheckoutModal(); }) 
            .catch((error) => { alert("❌ लॉगिन में समस्या: " + error.message); }); 
    } 
} 

function executeProfileLogout() { 
    firebase.auth().signOut().then(() => {
        currentUser = null;
        localStorage.removeItem('velvora_current_user');
        window.location.reload();
    });
} 

function showProfileDashboard() { 
    if (!currentUser) return openAuthModal(); 
    document.getElementById('homepage-view').classList.add('hidden'); 
    document.getElementById('details-view').classList.add('hidden'); 
    const pView = document.getElementById('profile-view'); 
    if (!pView) return; 
    pView.classList.remove('hidden'); 
    const orders = JSON.parse(localStorage.getItem(`orders_${currentUser}`)) || []; 

    pView.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-6 animate-3d-wave">
            <div class="bg-white border p-6 rounded-2xl dark:bg-[#121212] dark:border-gray-900 flex justify-between items-center shadow-2xs">
                <div>
                    <span class="text-[9px] font-black uppercase text-red-500 tracking-widest">Active Verified Profile</span>
                    <h2 class="text-xl font-black text-black dark:text-white uppercase tracking-tight break-all">${currentUser}</h2>
                </div>
                <button onclick="executeProfileLogout()" class="bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-700 transition">Sign Out</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white border p-4 rounded-xl dark:bg-[#121212] dark:border-gray-900 text-center shadow-3xs">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Orders Locked</p>
                    <h3 class="text-xl font-black mt-1 text-black dark:text-white">${orders.length}</h3>
                </div>
                <div class="bg-white border p-4 rounded-xl dark:bg-[#121212] dark:border-gray-900 text-center shadow-3xs">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cart Items Cache</p>
                    <h3 class="text-xl font-black mt-1 text-black dark:text-white">${cart.length}</h3>
                </div>
            </div>
            <div class="bg-white border p-5 rounded-2xl dark:bg-[#121212] dark:border-gray-900 shadow-2xs">
                <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2"><i class="fa-solid fa-box-open mr-1"></i> Your Real-Time Orders History Log</h3>
                <div class="space-y-3" id="profile-orders-history-container"></div>
            </div>
        </div>
    `; 

    const container = document.getElementById('profile-orders-history-container'); 
    if (orders.length === 0) { 
        container.innerHTML = `<p class="text-xs text-gray-400 font-bold py-4 text-center">You haven't placed any capsule drops yet.</p>`; 
    } else { 
        orders.forEach(ord => { 
            container.innerHTML += `
                <div class="border rounded-xl p-4 bg-gray-50 dark:bg-[#181818] dark:border-gray-800 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-3xs">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded dark:bg-white dark:text-black">${ord.id}</span>
                            <span class="text-gray-400 text-[10px] font-medium">${ord.date}</span>
                        </div>
                        <p class="font-medium text-gray-600 dark:text-gray-400 whitespace-pre-line">${ord.details}</p>
                    </div>
                    <div class="text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                        <span class="bg-green-100 text-green-700 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider">Dispatched via WhatsApp</span>
                    </div>
                </div>
            `; 
        }); 
    } 
} 

function openStepCheckout() { 
    if (!currentUser) { 
        alert("🔒 SECURITY PROTOCOL: Please login first!"); 
        openAuthModal(); 
        return; 
    } 
    document.getElementById('checkout-modal').classList.remove('hidden'); 
    showCheckoutStep(2);  
} 

function showCheckoutStep(stepNum) { 
    const modal = document.getElementById('checkout-modal'); 
    if (stepNum === 2) { 
        modal.innerHTML = `
            <div class="bg-white max-w-sm w-full p-5 rounded-xl relative dark:bg-[#121212] text-xs font-bold space-y-3 shadow-xl animate-3d-wave">
                <button onclick="closeCheckoutModal()" class="absolute top-3 right-3 text-sm">✕</button>
                <h3 class="text-[11px] font-black uppercase tracking-wider text-red-500 border-b pb-1.5">📦 SHIPPING ARRIVAL TARGET CODES</h3>
                <input type="text" id="chk-name" placeholder="Receiver Full Name" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                <textarea id="chk-address" placeholder="Complete Street Address Layer Structure" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows="2"></textarea>
                <div class="grid grid-cols-2 gap-2">
                    <input type="text" id="chk-city" placeholder="City Location" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <input type="text" id="chk-pincode" placeholder="Pincode Code" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                </div>
                <button onclick="processCheckoutStep2()" class="w-full bg-black text-white py-2 uppercase rounded text-[10px] tracking-widest font-black dark:bg-white dark:text-black live-waving-btn shadow-md">Continue to Payments →</button>
            </div>
        `; 
    } else if (stepNum === 3) { 
        modal.innerHTML = `
            <div class="bg-white max-w-sm w-full p-5 rounded-xl relative dark:bg-[#121212] text-xs font-bold space-y-4 shadow-xl animate-3d-wave">
                <button onclick="closeCheckoutModal()" class="absolute top-3 right-3 text-sm">✕</button>
                <h3 class="text-[11px] font-black uppercase tracking-wider text-red-500 border-b pb-1.5">💳 SYSTEM SETTLEMENT ROUTING</h3>
                <div class="space-y-2">
                    <label class="flex items-center gap-3 p-2.5 border rounded cursor-pointer dark:border-gray-800">
                        <input type="radio" name="pay-method" value="COD" checked>
                        <span class="font-black text-black dark:text-white text-[11px]">Cash On Delivery (COD Allocation)</span>
                    </label>
                    <label class="flex items-center gap-3 p-2.5 border rounded cursor-pointer dark:border-gray-800">
                        <input type="radio" name="pay-method" value="UPI / Online">
                        <span class="font-black text-black dark:text-white text-[11px]">Instant UPI Gateway Sync</span>
                    </label>
                </div>
                <button onclick="finalizeStepOrder()" class="w-full bg-emerald-600 text-white py-2.5 uppercase rounded text-[10px] font-black tracking-widest flex items-center justify-center gap-2 live-waving-btn shadow-md"><i class="fa-brands fa-whatsapp text-sm"></i> Route Order Stream via WhatsApp</button>
            </div>
        `; 
    } 
} 

function processCheckoutStep2() { 
    const name = document.getElementById('chk-name').value.trim(); 
    const addr = document.getElementById('chk-address').value.trim(); 
    const city = document.getElementById('chk-city').value.trim(); 
    const pin = document.getElementById('chk-pincode').value.trim(); 
    if(!name || !addr || !city || !pin) return alert('Complete delivery grid data required.'); 
    window.checkoutAddressString = `Name: ${name}\nAddress Log: ${addr}, ${city} - ${pin}`; 
    showCheckoutStep(3); 
} 

function finalizeStepOrder() { 
    const selectedPay = document.querySelector('input[name="pay-method"]:checked').value; 
    const orderId = 'VEL-' + Math.floor(100000 + Math.random() * 900000); 
    const currentDateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); 

    let orderLog = JSON.parse(localStorage.getItem(`orders_${currentUser}`)) || []; 
    orderLog.unshift({ 
        id: orderId, 
        date: currentDateStr, 
        details: window.checkoutItemDetails, 
        address: window.checkoutAddressString, 
        payment: selectedPay 
    }); 
    localStorage.setItem(`orders_${currentUser}`, JSON.stringify(orderLog)); 

    let sales = JSON.parse(localStorage.getItem('nexwear_sales')) || { totalRevenue: 0, totalOrders: 0 }; 
    let cleanPrice = parseInt(window.checkoutItemDetails.split('Price Summary: ₹')[1] || window.checkoutItemDetails.split('Collective Basket Value: ₹')[1] || '0'); 
    sales.totalRevenue += cleanPrice; 
    sales.totalOrders += 1; 
    localStorage.setItem('nexwear_sales', JSON.stringify(sales)); 

    const finalMsg = `*🚨 NEW CAPSULE ORDER SUBMISSION [VELVORA INC]*\n\n*Order Identification Trace:* ${orderId}\n*Customer Auth Trace:* ${currentUser}\n\n*Item Vector Structure:*\n${window.checkoutItemDetails}\n\n*Shipping Track Target:*\n${window.checkoutAddressString}\n\n*Payment Strategic Mode:* ${selectedPay}`; 
     
    closeCheckoutModal(); 
    cart = []; 
    updateCart(); 
    showHomepage(); 
    window.open(`https://wa.me/917348588153?text=${encodeURIComponent(finalMsg)}`, '_blank'); 
} 

function checkoutFromCart() { 
    if (!currentUser) { 
        alert("🔒 SECURITY PROTOCOL: Please login first!"); 
        openAuthModal(); 
        return; 
    } 
    if(cart.length === 0) return alert("Bag loop empty."); 
    let summary = cart.map((p, idx) => `${idx+1}. [${p.brand}] ${p.name} (${p.chosenSize}/${p.chosenColor})`).join('\n'); 
    let totalVal = cart.reduce((acc, p) => acc + (parseInt(p.price.toString().replace(/[^\d]/g, '')) || 0), 0); 
    window.checkoutItemDetails = `${summary}\nCollective Basket Value: ₹${totalVal}`; 
    toggleCart(); 
    openStepCheckout(); 
} 

function updateCart() { 
    const count = cart.length; 
    if(document.getElementById('cart-count')) document.getElementById('cart-count').innerText = count; 
}

async function loadCustomerOrders(userId) {
    const ordersList = document.getElementById('orders-list');
    if(!ordersList) return;
}
