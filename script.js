// 1. Firebase Initialization (मैक्सी भाई की असली डिटेल्स)
const firebaseConfig = {
  apiKey: " AIzaSyCUVM7Qt11vselCetcnc3wk3Y73RQOemlI",
  authDomain: "velvora-5737c.firebaseapp.com",
  projectId: "velvora-5737c",
  storageBucket: "velvora-5737c.firebasestorage.app",
  messagingSenderId: "945792570282",
  appId: "1:945792570282:web:5217a50aa347ca1bd311d319e",
  measurementId: "G-P0F5B0EFT1"
};

// Firebase को सुरक्षित रूप से चालू करें
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
let globalCachedProducts = []; // क्लाउड डेटा रखने के लिए ग्लोबल वेरिएबल

let currentUser = JSON.parse(localStorage.getItem('velvora_current_user')) || null;

window.addEventListener('DOMContentLoaded', async () => {
    switchTab('desc');
    initSearchEngine();
    updateUserNavUi();
    await fetchLiveProducts(); // Supabase से डेटा लोड करें
    
    // Recaptcha Verifier को बैकग्राउंड में तैयार करें
    if (document.getElementById('recaptcha-container')) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
    }
});

// Supabase से लाइव प्रोडक्ट्स डाउनलोड करने का फ़ंक्शन
async function fetchLiveProducts() {
    const grid = document.getElementById('products-grid');
    if(grid) grid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-12 font-bold text-xs">Loading live vault collection...</div>`;

    const { data: products, error } = await _supabase.from('products').select('*');
    if (error) {
        console.error("Error fetching live products:", error);
        if(grid) grid.innerHTML = `<div class="col-span-4 text-center text-red-500 py-12 font-bold text-xs">Failed to synchronize catalog stack.</div>`;
        return;
    }

    globalCachedProducts = products.map(p => {
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

function toggleDarkMode() { document.documentElement.classList.toggle('dark'); }
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

function updateUserNavUi() {
    const authBtn = document.getElementById('user-auth-nav-btn');
    if (!authBtn) return;
    if (currentUser) {
        authBtn.innerHTML = `<i class="fa-solid fa-circle-user text-sm animate-pulse"></i> <span>${currentUser.substring(0, 10)}...</span>`;
        authBtn.onclick = () => showProfileDashboard();
    } else {
        authBtn.innerHTML = `<i class="fa-solid fa-lock text-xs"></i> <span>Login</span>`;
        authBtn.onclick = () => openAuthModal();
    }
}

// 2. नया ओटीपी आधारित लॉगिन फॉर्म (Design)
function openAuthModal() {
    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-white max-w-sm w-full p-6 rounded-2xl relative dark:bg-[#121212] text-xs font-bold space-y-4 shadow-xl animate-3d-wave">
            <button onclick="closeCheckoutModal()" class="absolute top-4 right-4 text-sm">✕</button>
            <h3 class="text-sm font-black uppercase border-b pb-2 tracking-wider text-black dark:text-white">👤 CUSTOMER AUTH GATEWAY</h3>
            
            <!-- स्टेप 1: मोबाइल नंबर डालना -->
            <div id="phone-input-section" class="space-y-4">
                <div>
                    <label class="block mb-1 text-gray-400 uppercase text-[9px]">Enter Phone Number (10 Digits)</label>
                    <div class="flex gap-2">
                        <span class="p-2.5 bg-gray-100 dark:bg-gray-800 rounded border dark:border-gray-700 flex items-center">+91</span>
                        <input type="tel" id="auth-phone-input" placeholder="e.g., 9876543210" class="w-full p-2.5 border rounded dark:bg-gray-800 dark:border-gray-700 focus:outline-none">
                    </div>
                </div>
                <button onclick="handlePhoneAuthSubmit()" id="send-otp-btn" class="w-full bg-black text-white py-2.5 uppercase rounded text-[10px] tracking-widest font-black dark:bg-white dark:text-black live-waving-btn">Send OTP 🚀</button>
            </div>

            <!-- स्टेप 2: OTP भरना (शुरू में छुपा रहेगा) -->
            <div id="otp-input-section" class="space-y-4 hidden">
                <div>
                    <label class="block mb-1 text-gray-400 uppercase text-[9px]">Enter OTP Code</label>
                    <input type="text" id="auth-otp-input" placeholder="6-Digit OTP" class="w-full p-2.5 border rounded dark:bg-gray-800 dark:border-gray-700 focus:outline-none text-center tracking-widest text-lg">
                </div>
                <button onclick="handleOtpVerificationSubmit()" class="w-full bg-emerald-600 text-white py-2.5 uppercase rounded text-[10px] tracking-widest font-black">Verify OTP & Login 🏆</button>
            </div>
        </div>
    `;
}

// 3. OTP भेजने का फंक्शन
function handlePhoneAuthSubmit() {
    const phone = document.getElementById('auth-phone-input').value.trim();
    if (phone.length !== 10 || isNaN(phone)) {
        return alert("🚨 कृपया एक मान्य 10 अंकों का मोबाइल नंबर डालें!");
    }

    const fullPhoneNumber = "+91" + phone;
    const appVerifier = window.recaptchaVerifier;

    document.getElementById('send-otp-btn').innerText = "Sending OTP...";
    document.getElementById('send-otp-btn').disabled = true;

    firebase.auth().signInWithPhoneNumber(fullPhoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            alert("✅ OTP सफलतापूर्वक आपके मोबाइल पर भेज दिया गया है!");
            
            // फ़ोन इनपुट को छिपाकर OTP बॉक्स दिखाएं
            document.getElementById('phone-input-section').classList.add('hidden');
            document.getElementById('otp-input-section').classList.remove('hidden');
        }).catch((error) => {
            alert("❌ समस्या आई: " + error.message);
            document.getElementById('send-otp-btn').innerText = "Send OTP 🚀";
            document.getElementById('send-otp-btn').disabled = false;
            // एरर आने पर recaptcha रीसेट करना आवश्यक है
            window.recaptchaVerifier.render().then(function(widgetId) {
                grecaptcha.reset(widgetId);
            });
        });
}

// 4. OTP वेरीफाई करने का फंक्शन
function handleOtpVerificationSubmit() {
    const code = document.getElementById('auth-otp-input').value.trim();
    if (code.length !== 6 || isNaN(code)) {
        return alert("🚨 कृपया सही 6-अंकीय OTP कोड भरें!");
    }

    window.confirmationResult.confirm(code)
        .then((result) => {
            // लॉगिन सफल! यूजर डेटा लोकल स्टोरेज में सेव करें
            currentUser = result.user.phoneNumber;
            localStorage.setItem('velvora_current_user', JSON.stringify(currentUser));
            
            let orderLog = JSON.parse(localStorage.getItem(`orders_${currentUser}`)) || [];
            localStorage.setItem(`orders_${currentUser}`, JSON.stringify(orderLog));

            closeCheckoutModal();
            updateUserNavUi();
            alert(`🎉 लॉगिन सफल! स्वागत है वेल्वोरा स्टोर पर!`);
        }).catch((error) => {
            alert("❌ गलत OTP! कृपया सही कोड दर्ज करें या पुनः प्रयास करें।");
        });
}

function executeProfileLogout() {
    currentUser = null;
    localStorage.removeItem('velvora_current_user');
    showHomepage();
    updateUserNavUi();
    alert("Logged out safely.");
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
                <div class="bg-white border p-4 rounded-xl dark:bg-[#121212] dark:border-gray-900 text-center shadow-3xs">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Wishlist Items</p>
                    <h3 class="text-xl font-black mt-1 text-black dark:text-white">${wishlist.length}</h3>
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
        alert("🔒 SECURITY PROTOCOL: Please login / build your profile space layout first!");
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
        alert("🔒 SECURITY PROTOCOL: Please login / build your profile space layout first!");
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
 
