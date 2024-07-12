const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const ordersFile = './orders.json';
const inventoryFile = './inventory.json';
const productsFile = './product.json';
const cartFile = './cart.json';

const readJsonFile = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const writeJsonFile = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const calculateTaxes = (product) => {
    product['priceWithoutTax'] = product['price'];
    delete product['price'];
    if (product['vatTax']) {
        product['actualPrice'] = Math.round(((product['priceWithoutTax'] * product['vatTaxPercentage']) / 100) + product['priceWithoutTax']);
        product['taxAmount'] = Math.round((product['priceWithoutTax'] * product['vatTaxPercentage']) / 100);
    } else {
        product['actualPrice'] = product['priceWithoutTax'];
    }

    return product;
};

// Mock Inventory Check
app.get('/product/:productId', (req, res) => {
    const { productId } = req.params;
    const products = readJsonFile(productsFile);
    let product = products.find(product => product.id === parseInt(productId));
    if (product) {
        const inventory = readJsonFile(inventoryFile);
        const item = inventory.find(item => item.product_id === parseInt(productId));
        if (item && item.stock) {
            product.stock = item.stock;
        }

        product = calculateTaxes(product);
        delete product.tags;
        res.json({ product: product });
    } else {
        res.status(404).json({ statusMessage: `No product with id ${productId}` });
    }
});

app.get('/products/allProducts', (req, res) => {
    const products = readJsonFile(productsFile);
    if (products.length > 0) {
        products.forEach(product => {
            product = calculateTaxes(product);
            delete product.tags
        });

        res.json({ products: products });
    } else {
        res.status(404).json({ statusMessage: `No products provided` });
    }
});

app.post('/products/searchByTags', (req, res) => {
    const providedTags = req.body;
    if (providedTags && Array.isArray(providedTags)) {
        const products = readJsonFile(productsFile);
        let matchedProducts = [];
        products.forEach((product) => {
            const tags = product.tags?.split(",");
            for (const tag of tags) {
                if (providedTags.includes(tag.trim())) {
                    product = calculateTaxes(product);
                    delete product.tags;
                    matchedProducts.push(product);
                    break;
                }
            }
        });

        res.json({ products: matchedProducts });
    } else {
        res.status(404).json({ statusMessage: `No search terms provided` });
    }
});

app.post('/product/addProduct', (req, res) => {
    const product = req.body;
    if (product) {
        const products = readJsonFile(productsFile);

        const existingProduct = products.filter((item) => { return item.name === product.name });

        if (existingProduct.length > 0) {
            res.status(400).json({ statusMessage: "Product already exists. Try updating the inventory" });
            return;
        }

        const inventory = readJsonFile(inventoryFile);
        const productId = products[products.length - 1]?.id + 1;
        const stock = product.stock;
        delete product.stock;
        product.id = productId;
        product.vatTaxPercentage = parseFloat(product.vatTaxPercentage);
        products.push(product);
        writeJsonFile(productsFile, products);

        const inventoryId = inventory[inventory.length - 1]?.id + 1;
        const invetoryObj = {
            id: inventoryId,
            productId: product.id,
            stock: stock
        }

        inventory.push(invetoryObj);
        writeJsonFile(inventoryFile, inventory);

        res.json({ statusMessage: `Created product ${product.name} with ID ${product.id} successfully` });
    } else {
        res.status(400).json({ statusMessage: "No product details provided" });
    }
});

app.post('/order/addToCart', (req, res) => {
    const orderDetails = req.body;
    if (orderDetails && Array.isArray(orderDetails)) {
        const cardDetails = readJsonFile(cartFile);
    } else {
        res.status(400).json({ statusMessage: "No product(s) details provided" });
    }
});

// Mock Payment Processing
app.post('/payment', (req, res) => {
    const { amount, method } = req.body;
    if (amount > 0 && ['credit_card', 'paypal'].includes(method)) {
        res.json({ success: true, transactionId: 'txn12345' });
    } else {
        res.status(400).json({ success: false });
    }
});

// Mock Order Management System (OMS) Update
app.post('/oms/order', (req, res) => {
    const order = req.body;
    const orders = readJsonFile(ordersFile);
    order.id = `order_${orders.length + 1}`;
    orders.push(order);
    writeJsonFile(ordersFile, orders);
    res.json({ success: true, orderId: order.id });
});

// Mock Email Notification
app.post('/notify/email', (req, res) => {
    const { email, message } = req.body;
    console.log(`Email sent to ${email}: ${message}`);
    res.json({ success: true });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Mock service running on port ${port}`);
});
