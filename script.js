/* ==========================================
   1. المتغيرات العامة والحالة
   ========================================== */
let products = [];
let cart = [];
let selectedStockProduct = null;

const productsGrid = document.getElementById("products-grid");
const cartItemsContainer = document.getElementById("cart-items");
const searchInput = document.getElementById("search-input");

const summaryUniqueItems = document.getElementById("summary-unique-items");
const summaryTotalQty = document.getElementById("summary-total-qty");
const summaryTotalPrice = document.getElementById("summary-total-price");

const productModal = document.getElementById("product-modal");
const manageModal = document.getElementById("manage-modal");
const addStockModal = document.getElementById("add-stock-modal");
const productForm = document.getElementById("product-form");
const manageTableBody = document.getElementById("manage-table-body");

const manageSearchInput = document.getElementById("manage-search-input");
const manageStockFilter = document.getElementById("manage-stock-filter");

const exportBtn = document.getElementById("export-backup-btn");
const importBtn = document.getElementById("import-backup-btn");
const importFileInput = document.getElementById("import-file-input");

/* ==========================================
   2. التهيئة واسترجاع البيانات
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadCart();
    renderProducts();
    renderCart();
    setupEventListeners();
});

function loadProducts() {
    const stored = localStorage.getItem("products");
    if (stored) {
        products = JSON.parse(stored);
    } else {
        products = [
            { id: 1001, name: "مياه معدنية", price: 500, quantity: 50 },
            { id: 1002, name: "عصير طبيعي", price: 1000, quantity: 30 },
            { id: 1003, name: "بسكويت شاي", price: 750, quantity: 25 },
            { id: 1004, name: "حليب طازج", price: 1500, quantity: 20 }
        ];
        saveProducts();
    }
}

function saveProducts() {
    localStorage.setItem("products", JSON.stringify(products));
}

function loadCart() {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) cart = JSON.parse(storedCart);
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function generateNextId() {
    if (products.length === 0) return 1001;
    return Math.max(...products.map(p => p.id)) + 1;
}

/* ==========================================
   3. النسخ الاحتياطي والاسترجاع
   ========================================== */
function exportBackup() {
    if (products.length === 0) {
        showToast("لا توجد بيانات لتصديرها!", "error");
        return;
    }

    const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        products: products,
        cart: cart
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    const filename = `pos_backup_${new Date().toISOString().slice(0, 10)}.json`;

    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("تم تصدير النسخة الاحتياطية بنجاح", "success");
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data && Array.isArray(data.products)) {
                if (confirm("هل أنت متأكد من استرجاع البيانات؟ سيتم استبدال البيانات الحالية بالكامل.")) {
                    products = data.products;
                    cart = Array.isArray(data.cart) ? data.cart : [];

                    saveProducts();
                    saveCart();
                    renderProducts();
                    renderCart();
                    
                    if (manageModal.classList.contains("active")) {
                        renderManageTable();
                    }

                    showToast("تمت استعادة البيانات بنجاح!", "success");
                }
            } else {
                showToast("ملف النسخة الاحتياطية غير صالح!", "error");
            }
        } catch (err) {
            showToast("حدث خطأ أثناء قراءة الملف!", "error");
        }
        
        importFileInput.value = ""; // إعادة ضبط الإدخال
    };

    reader.readAsText(file);
}

/* ==========================================
   4. عرض المنتجات وإدارة السلة
   ========================================== */
function renderProducts(itemsToRender = products) {
    productsGrid.innerHTML = "";

    if (itemsToRender.length === 0) {
        productsGrid.innerHTML = `<div class="empty-cart-msg">لا يوجد منتجات تطابق البحث</div>`;
        return;
    }

    itemsToRender.forEach(product => {
        const isOutOfStock = product.quantity <= 0;
        const card = document.createElement("div");
        card.className = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        
        card.innerHTML = `
            <div class="product-title">${product.name}</div>
            <div class="product-id">ID: ${product.id}</div>
            <div class="product-price">${product.price.toLocaleString()} ريال</div>
            <div class="product-stock">
                <span class="stock-badge ${isOutOfStock ? 'out-badge' : ''}">
                    ${isOutOfStock ? 'نفدت الكمية' : `المتوفر: ${product.quantity}`}
                </span>
            </div>
            <button class="add-btn-card" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? 'غير متوفر' : 'إضافة للسلة'}
            </button>
        `;

        card.addEventListener("click", () => {
            if (!isOutOfStock) addToCart(product.id);
            else showToast("هذا المنتج غير متوفر حالياً!", "error");
        });

        productsGrid.appendChild(card);
    });
}

function renderCart() {
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="empty-cart-msg">سلة المشتريات فارغة حالياً</div>`;
        calculateTotal();
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.cartQuantity;
        const cartItemEl = document.createElement("div");
        cartItemEl.className = "cart-item";

        cartItemEl.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-subtotal">${itemTotal.toLocaleString()} ريال</span>
            </div>
            <div class="cart-item-controls">
                <span class="cart-item-price">${item.price.toLocaleString()} × ${item.cartQuantity}</span>
                <div class="qty-controls">
                    <button class="qty-btn btn-decrease" data-id="${item.id}">-</button>
                    <span class="qty-value">${item.cartQuantity}</span>
                    <button class="qty-btn btn-increase" data-id="${item.id}">+</button>
                    <button class="btn btn-danger-outline btn-sm btn-remove" data-id="${item.id}" style="margin-right: 8px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        cartItemsContainer.appendChild(cartItemEl);
    });

    document.querySelectorAll(".btn-increase").forEach(btn => {
        btn.addEventListener("click", (e) => { e.stopPropagation(); increaseQuantity(parseInt(btn.dataset.id)); });
    });

    document.querySelectorAll(".btn-decrease").forEach(btn => {
        btn.addEventListener("click", (e) => { e.stopPropagation(); decreaseQuantity(parseInt(btn.dataset.id)); });
    });

    document.querySelectorAll(".btn-remove").forEach(btn => {
        btn.addEventListener("click", (e) => { e.stopPropagation(); removeFromCart(parseInt(btn.dataset.id)); });
    });

    calculateTotal();
}

function calculateTotal() {
    const totalUnique = cart.length;
    const totalQty = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

    summaryUniqueItems.textContent = totalUnique;
    summaryTotalQty.textContent = totalQty;
    summaryTotalPrice.textContent = `${totalPrice.toLocaleString()} ريال`;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cartItem = cart.find(item => item.id === productId);
    const currentCartQty = cartItem ? cartItem.cartQuantity : 0;

    if (currentCartQty + 1 > product.quantity) {
        showToast("الكمية المطلوبة تتجاوز المخزون المتوفر!", "error");
        return;
    }

    if (cartItem) {
        cartItem.cartQuantity++;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, cartQuantity: 1 });
    }

    saveCart();
    renderCart();
    showToast(`تمت إضافة "${product.name}" إلى السلة`, "success");
}

function increaseQuantity(productId) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem && product) {
        if (cartItem.cartQuantity + 1 > product.quantity) {
            showToast("وصلت للحد الأقصى للمخزون المتاح!", "error");
            return;
        }
        cartItem.cartQuantity++;
        saveCart();
        renderCart();
    }
}

function decreaseQuantity(productId) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.cartQuantity--;
        if (cartItem.cartQuantity <= 0) removeFromCart(productId);
        else {
            saveCart();
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    showToast("تم حذف المنتج من السلة", "info");
}

function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    document.getElementById("customer-name").value = "";
    document.getElementById("payment-type").value = "";
    saveCart();
    renderCart();
    showToast("تم تفريغ السلة بنجاح", "info");
}

/* ==========================================
   5. إدارة جدول المخزون
   ========================================== */
function renderManageTable() {
    manageTableBody.innerHTML = "";

    const query = manageSearchInput.value.trim().toLowerCase();
    const filterStock = manageStockFilter.value;

    const filtered = products.filter(product => {
        const matchesQuery = product.name.toLowerCase().includes(query) || 
                             product.id.toString().includes(query);
        let matchesStock = true;

        if (filterStock === "in-stock") matchesStock = product.quantity > 0;
        else if (filterStock === "out-of-stock") matchesStock = product.quantity <= 0;

        return matchesQuery && matchesStock;
    });

    if (filtered.length === 0) {
        manageTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">لا توجد منتجات مطابقة للفلترة</td></tr>`;
        return;
    }

    filtered.forEach(product => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.price.toLocaleString()}</td>
            <td><span style="color: ${product.quantity > 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${product.quantity}</span></td>
            <td>
                <button class="btn btn-success btn-sm btn-add-stock" data-id="${product.id}"><i class="fa-solid fa-plus"></i> مخزون</button>
                <button class="btn btn-primary btn-sm btn-edit" data-id="${product.id}">تعديل</button>
                <button class="btn btn-danger btn-sm btn-delete" data-id="${product.id}">حذف</button>
            </td>
        `;
        manageTableBody.appendChild(tr);
    });

    document.querySelectorAll(".btn-add-stock").forEach(btn => {
        btn.addEventListener("click", () => {
            const prod = products.find(p => p.id === parseInt(btn.dataset.id));
            if (prod) openAddStockModal(prod);
        });
    });

    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => editProduct(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => deleteProduct(parseInt(btn.dataset.id)));
    });
}

function openAddStockModal(product) {
    selectedStockProduct = product;
    document.getElementById("stock-product-name").textContent = `المنتج: ${product.name} (ID: ${product.id})`;
    document.getElementById("stock-current-count").textContent = `المخزون الحالي: ${product.quantity}`;
    document.getElementById("add-stock-input").value = 1;
    
    addStockModal.classList.add("active");
    setTimeout(() => document.getElementById("add-stock-input").focus(), 100);
}

document.getElementById("confirm-add-stock-btn").addEventListener("click", () => {
    const addQty = parseInt(document.getElementById("add-stock-input").value);
    if (selectedStockProduct && !isNaN(addQty) && addQty > 0) {
        selectedStockProduct.quantity += addQty;
        saveProducts();
        renderProducts();
        renderManageTable();
        addStockModal.classList.remove("active");
        showToast(`تمت إضافة ${addQty} قطع للمخزون بنجاح`, "success");
    } else {
        showToast("يرجى إدخال كمية صالحة", "error");
    }
});

/* ==========================================
   6. طباعة الفاتورة وإتمام البيع
   ========================================== */
function generateInvoicePDF(customerName, paymentType) {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
    const totalQty = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const dateStr = new Date().toLocaleString("ar-SA");

    const invoiceEl = document.createElement("div");
    invoiceEl.style.padding = "20px";
    invoiceEl.style.direction = "rtl";

    const itemsRows = cart.map((item, index) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.price.toLocaleString()} ريال</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.cartQuantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${(item.price * item.cartQuantity).toLocaleString()} ريال</td>
        </tr>
    `).join("");

    invoiceEl.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2e86de; padding-bottom: 10px;">
            <h2 style="margin: 0; color: #1b2a47;">فاتورة مبيعات</h2>
            <p style="margin: 5px 0; color: #666;">نظام نقطة البيع</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <p><strong>اسم العميل:</strong> ${customerName}</p>
            <p><strong>نوع الفاتورة:</strong> ${paymentType}</p>
            <p><strong>التاريخ:</strong> ${dateStr}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #2e86de; color: white;">
                    <th style="border: 1px solid #ddd; padding: 8px;">#</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">المنتج</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">السعر</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">الكمية</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">المجموع</th>
                </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
        </table>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
            <p><strong>إجمالي القطع:</strong> ${totalQty}</p>
            <h3 style="color: #2e86de;"><strong>المجموع النهائي:</strong> ${totalPrice.toLocaleString()} ريال</h3>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `Invoice_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(invoiceEl).save();
}

function checkout() {
    if (cart.length === 0) {
        showToast("سلة المشتريات فارغة!", "error");
        return;
    }

    const customerNameInput = document.getElementById("customer-name");
    const paymentTypeSelect = document.getElementById("payment-type");

    const customerName = customerNameInput.value.trim();
    const paymentType = paymentTypeSelect.value;

    if (!customerName) {
        showToast("يرجى إدخال اسم العميل!", "error");
        customerNameInput.focus();
        return;
    }

    if (!paymentType) {
        showToast("يرجى تحديد نوع الفاتورة!", "error");
        paymentTypeSelect.focus();
        return;
    }

    generateInvoicePDF(customerName, paymentType);

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) product.quantity -= item.cartQuantity;
    });

    cart = [];
    customerNameInput.value = "";
    paymentTypeSelect.value = "";
    saveCart();
    saveProducts();
    renderProducts();
    renderCart();

    showToast("تمت عملية البيع واستخراج الفاتورة بنجاح!", "success");
}

/* ==========================================
   7. النوافذ والأحداث
   ========================================== */
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById("product-edit-id").value = product.id;
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-quantity").value = product.quantity;

    manageModal.classList.remove("active");
    productModal.classList.add("active");
    document.getElementById("modal-title").textContent = "تعديل المنتج";
}

function deleteProduct(productId) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        products = products.filter(p => p.id !== productId);
        cart = cart.filter(item => item.id !== productId);

        saveProducts();
        saveCart();
        renderProducts();
        renderCart();
        renderManageTable();
        showToast("تم حذف المنتج بنجاح", "info");
    }
}

productForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const editId = document.getElementById("product-edit-id").value;
    const name = document.getElementById("product-name").value.trim();
    const price = parseFloat(document.getElementById("product-price").value);
    const quantity = parseInt(document.getElementById("product-quantity").value);

    if (price < 0 || quantity < 0) {
        showToast("لا يمكن أن تكون القيم سالبة!", "error");
        return;
    }

    if (editId) {
        const product = products.find(p => p.id === parseInt(editId));
        if (product) {
            product.name = name;
            product.price = price;
            product.quantity = quantity;
            showToast("تم تعديل البيانات بنجاح", "success");
        }
    } else {
        const newId = generateNextId();
        products.push({ id: newId, name, price, quantity });
        showToast(`تمت إضافة المنتج برقم (${newId})`, "success");
    }

    saveProducts();
    saveCart();
    renderProducts();
    renderCart();
    productModal.classList.remove("active");
    productForm.reset();
});

function setupEventListeners() {
    // أحداث النسخ الاحتياطي والاسترجاع
    exportBtn.addEventListener("click", exportBackup);
    importBtn.addEventListener("click", () => importFileInput.click());
    importFileInput.addEventListener("change", importBackup);

    // باقي الأحداث
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        renderProducts(products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.id.toString().includes(query)
        ));
    });

    manageSearchInput.addEventListener("input", renderManageTable);
    manageStockFilter.addEventListener("change", renderManageTable);

    document.getElementById("clear-cart-btn").addEventListener("click", clearCart);
    document.getElementById("checkout-btn").addEventListener("click", checkout);

    document.getElementById("open-product-modal-btn").addEventListener("click", () => {
        productForm.reset();
        document.getElementById("product-edit-id").value = "";
        document.getElementById("modal-title").textContent = "إضافة منتج جديد";
        productModal.classList.add("active");
        setTimeout(() => document.getElementById("product-name").focus(), 100);
    });

    document.getElementById("close-modal-btn").addEventListener("click", () => productModal.classList.remove("active"));
    document.getElementById("cancel-modal-btn").addEventListener("click", () => productModal.classList.remove("active"));

    document.getElementById("close-stock-modal-btn").addEventListener("click", () => addStockModal.classList.remove("active"));
    document.getElementById("cancel-stock-modal-btn").addEventListener("click", () => addStockModal.classList.remove("active"));

    document.getElementById("manage-products-btn").addEventListener("click", () => {
        manageSearchInput.value = "";
        manageStockFilter.value = "all";
        renderManageTable();
        manageModal.classList.add("active");
    });

    document.getElementById("close-manage-modal-btn").addEventListener("click", () => manageModal.classList.remove("active"));
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-check-circle";
    if (type === "error") icon = "fa-exclamation-circle";

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}