import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinanceOverview from "./overviews/FinanceOverview";
import SocialMediaOverview from "./overviews/SocialMediaOverview";

export default function OverviewPage() {
  const [activeTab, setActiveTab] = useState("finance");

  return (
    <div className="page-container max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 h-11 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="finance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Finance
          </TabsTrigger>
          <TabsTrigger value="social" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Social Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <FinanceOverview />
          </motion.div>
        </TabsContent>
        <TabsContent value="social" className="mt-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SocialMediaOverview />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
