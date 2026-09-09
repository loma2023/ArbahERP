const Account = require("../Models/AccountSchema");
const ChartOfAccounts = require("./ChartOfAccounts");

async function SeedChartOfAccounts() {
    try {
        // Wait a bit to ensure connection is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        const existingAccounts = await Account.countDocuments();
        if (existingAccounts > 0) {
            console.log("✅ Chart Of Accounts Already Exists");
            return;
        }

        // Build a map of all accounts by code for quick lookup
        const accountMap = new Map();
        const allAccounts = [];

        // First pass: create all account objects with proper parent references
        for (const item of ChartOfAccounts) {
            const accountData = {
                code: item.code,
                name: item.name,
                type: item.type,
                category: item.category,
                parent: null,
                parentCode: item.parentCode || null,
                level: item.level,
                accountPath: item.code,
                isGroup: !item.isLeaf,
                isLeaf: item.isLeaf,
                allowTransactions: item.allowTransactions,
                normalBalance: item.normalBalance,
                openingBalance: 0,
                currentBalance: 0,
                totalDebits: 0,
                totalCredits: 0,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            accountMap.set(item.code, accountData);
            allAccounts.push(accountData);
        }

        // Second pass: resolve parent references and build accountPath
        for (const item of ChartOfAccounts) {
            if (item.parentCode) {
                const parentData = accountMap.get(item.parentCode);
                const childData = accountMap.get(item.code);

                if (parentData && childData) {
                    childData.accountPath = parentData.accountPath + "/" + item.code;
                }
            }
        }

        // Sort by level to insert parents before children
        const sortedAccounts = allAccounts.sort((a, b) => a.level - b.level);

        // Insert all accounts using native driver for maximum speed
        // This bypasses mongoose middleware completely
        const collection = Account.collection;
        const result = await collection.insertMany(sortedAccounts, { 
            ordered: true  // Keep ordered to ensure parents inserted before children
        });

        console.log(`✅ Chart Of Accounts Created Successfully (${result.insertedCount} Accounts)`);

        // Now update parent references with actual ObjectIds
        const insertedAccounts = await Account.find({}).lean();
        const idMap = new Map();
        insertedAccounts.forEach(acc => {
            idMap.set(acc.code, acc._id);
        });

        // Update parent references
        const bulkOps = [];
        for (const item of ChartOfAccounts) {
            if (item.parentCode) {
                const parentId = idMap.get(item.parentCode);
                const childId = idMap.get(item.code);
                if (parentId && childId) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: childId },
                            update: { $set: { parent: parentId } }
                        }
                    });
                }
            }
        }

        if (bulkOps.length > 0) {
            await collection.bulkWrite(bulkOps, { ordered: false });
            console.log(`✅ Updated ${bulkOps.length} parent references`);
        }

    } catch (error) {
        console.error("❌ Seed Error:", error.message);
        throw error;
    }
}

// Run directly: node Config/SeedChartOfAccounts.js
if (require.main === module) {
    require("dotenv").config();
    const mongoose = require("mongoose");

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("MongoDB Connected");
            return SeedChartOfAccounts();
        })
        .then(() => {
            console.log("Done");
            process.exit(0);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = SeedChartOfAccounts;