import { useState, useEffect } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Search, 
  Tag, 
  Percent,
  Ticket,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DiscountCodeDialog } from "@/components/admin/DiscountCodeDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_purchase: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  applies_to: "all" | "specific" | null;
  created_at: string;
}

interface Stats {
  totalCodes: number;
  activeCodes: number;
  expiredCodes: number;
  totalUsage: number;
}

const AdminDiscountCodes = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<DiscountCode | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalCodes: 0,
    activeCodes: 0,
    expiredCodes: 0,
    totalUsage: 0,
  });

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  useEffect(() => {
    let filtered = discountCodes;
    
    if (searchTerm) {
      filtered = filtered.filter(
        (code) =>
          code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          code.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((code) => {
        const expired = code.valid_until && new Date(code.valid_until) < new Date();
        const limitReached = code.usage_limit && code.usage_count && code.usage_count >= code.usage_limit;
        
        if (statusFilter === "active") return code.active && !expired && !limitReached;
        if (statusFilter === "expired") return expired || limitReached;
        if (statusFilter === "inactive") return !code.active;
        return true;
      });
    }

    setFilteredCodes(filtered);
  }, [searchTerm, statusFilter, discountCodes]);

  const fetchDiscountCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const codes = (data as DiscountCode[]) || [];
      setDiscountCodes(codes);
      setFilteredCodes(codes);

      // Calculate stats
      const now = new Date();
      const activeCodes = codes.filter(c => {
        const expired = c.valid_until && new Date(c.valid_until) < now;
        const limitReached = c.usage_limit && c.usage_count && c.usage_count >= c.usage_limit;
        return c.active && !expired && !limitReached;
      });
      const expiredCodes = codes.filter(c => {
        const expired = c.valid_until && new Date(c.valid_until) < now;
        const limitReached = c.usage_limit && c.usage_count && c.usage_count >= c.usage_limit;
        return expired || limitReached;
      });
      const totalUsage = codes.reduce((sum, c) => sum + (c.usage_count || 0), 0);

      setStats({
        totalCodes: codes.length,
        activeCodes: activeCodes.length,
        expiredCodes: expiredCodes.length,
        totalUsage,
      });
    } catch (error) {
      logger.error("Error fetching discount codes", error);
      toast.error("Failed to load discount codes");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setSelectedCode(code);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCode(undefined);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setCodeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!codeToDelete) return;

    try {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", codeToDelete);

      if (error) throw error;

      toast.success("Discount code deleted successfully");
      fetchDiscountCodes();
    } catch (error) {
      logger.error("Error deleting discount code", error);
      toast.error("Failed to delete discount code");
    } finally {
      setDeleteDialogOpen(false);
      setCodeToDelete(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}" to clipboard`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const getStatusBadge = (code: DiscountCode) => {
    if (!code.active) {
      return (
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    if (isExpired(code.valid_until)) {
      return (
        <Badge variant="destructive" className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (code.usage_limit && code.usage_count && code.usage_count >= code.usage_limit) {
      return (
        <Badge variant="destructive" className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Limit Reached
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient, 
    delay 
  }: { 
    title: string; 
    value: number; 
    icon: React.ElementType; 
    gradient: string;
    delay: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`relative overflow-hidden border-0 shadow-lg ${gradient} text-white`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-16 bg-white/20 mt-1" />
              ) : (
                <p className="text-3xl font-bold">{value}</p>
              )}
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-purple-500/30">
                <Percent className="h-7 w-7 text-white" />
              </div>
              Promo Codes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Create and manage discount codes & vouchers
            </p>
          </div>
          <Button 
            onClick={handleCreate}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 border-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Code
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Codes"
            value={stats.totalCodes}
            icon={Tag}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            delay={0.1}
          />
          <StatCard
            title="Active Codes"
            value={stats.activeCodes}
            icon={CheckCircle2}
            gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            delay={0.2}
          />
          <StatCard
            title="Expired/Used"
            value={stats.expiredCodes}
            icon={Clock}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            delay={0.3}
          />
          <StatCard
            title="Total Redemptions"
            value={stats.totalUsage}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            delay={0.4}
          />
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by code or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "active", "expired", "inactive"] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={statusFilter === status 
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0" 
                        : "border-slate-200 dark:border-slate-600"
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-8 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : filteredCodes.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="text-center py-16">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <Ticket className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  No promo codes found
                </h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first promo code to offer discounts to your customers"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button 
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Code
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Code</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Discount</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Applies To</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Usage</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Valid Until</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes.map((code, index) => (
                      <motion.tr
                        key={code.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
                              <Ticket className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                  {code.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-violet-500"
                                  onClick={() => handleCopyCode(code.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {code.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs truncate">
                                  {code.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {code.discount_type === "percentage"
                                ? `${code.discount_value}%`
                                : `$${code.discount_value.toFixed(2)}`}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {code.discount_type === "percentage" ? "%" : "Fixed"}
                            </Badge>
                          </div>
                          {code.minimum_purchase && code.minimum_purchase > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              Min: ${code.minimum_purchase}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={code.applies_to === 'specific' ? 'secondary' : 'outline'}
                            className={code.applies_to === 'specific' 
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-0' 
                              : 'border-slate-200 dark:border-slate-600'
                            }
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {code.applies_to === 'specific' ? 'Select Items' : 'All Products'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {code.usage_count || 0}
                            </span>
                            {code.usage_limit && (
                              <span className="text-slate-400">/ {code.usage_limit}</span>
                            )}
                          </div>
                          {code.usage_limit && (
                            <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                style={{ width: `${Math.min(((code.usage_count || 0) / code.usage_limit) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(code.valid_until)}
                        </TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <DropdownMenuItem 
                                onClick={() => handleCopyCode(code.code)}
                                className="cursor-pointer"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Code
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleEdit(code)}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(code.id)}
                                className="text-red-600 dark:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </motion.div>
      </main>

      <DiscountCodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        discountCode={selectedCode}
        onSuccess={fetchDiscountCodes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800 dark:text-white">Delete Promo Code</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this promo code? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDiscountCodes;
