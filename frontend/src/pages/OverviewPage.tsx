// frontend/src/pages/OverviewPage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import FinanceOverview from "./overviews/FinanceOverview";
import SocialMediaOverview from "./overviews/SocialMediaOverview";
import InventoryOverview from "./overviews/InventoryOverview";

export default function OverviewPage() {
    const [activeTab, setActiveTab] = useState("finance");

    const tabs = [
        { id: "finance", label: "Finance" },
        { id: "social", label: "Social Media" },
        { id: "inventory", label: "Inventory" },
    ];

    return (
        <div className="page-container animate-in fade-in duration-500 max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Fancy Animated Tab Bar */}
                <div className="flex justify-center sm:justify-start w-full mb-10">
                    <div className="flex space-x-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-6 py-3 rounded-xl text-lg font-medium transition-colors outline-none whitespace-nowrap ${
                                    activeTab === tab.id ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                                }`}
                                style={{ WebkitTapHighlightColor: "transparent" }}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-white shadow-sm border border-gray-200/50 rounded-xl"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content with Slide-up Transition */}
                <TabsContent value="finance">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <FinanceOverview />
                    </motion.div>
                </TabsContent>
                <TabsContent value="social">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <SocialMediaOverview />
                    </motion.div>
                </TabsContent>
                <TabsContent value="inventory">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <InventoryOverview />
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
