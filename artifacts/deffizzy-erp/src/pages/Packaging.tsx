import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, Archive } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, getListPackagesQueryKey } from "@workspace/api-client-react";
import { Button, Input, Modal } from "@/components/shared-ui";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthUserRole } from "@workspace/api-client-react";

const formSchema = z.object({
  packageType: z.string().min(2, "Type is required"),
  stock: z.coerce.number().min(0),
  addedStock: z.coerce.number().min(0),
  supply: z.coerce.number().min(0),
  closingStock: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function Packaging() {
  const { data: items = [], isLoading } = useListPackages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === AuthUserRole.ADMIN;

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { stock: 0, addedStock: 0, supply: 0, closingStock: 0 },
  });

  const createMutation = useCreatePackage({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() }); toast({ title: "Package recorded" }); closeModal(); } } });
  const updateMutation = useUpdatePackage({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() }); toast({ title: "Package updated" }); closeModal(); } } });
  const deleteMutation = useDeletePackage({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() }); toast({ title: "Package deleted" }); } } });

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      reset({ packageType: item.packageType, stock: item.stock, addedStock: item.addedStock ?? 0, supply: item.supply ?? 0, closingStock: item.closingStock ?? 0 });
    } else {
      setEditingItem(null);
      reset({ packageType: "", stock: 0, addedStock: 0, supply: 0, closingStock: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: data as any });
    else createMutation.mutate({ data: data as any });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this packaging record?")) deleteMutation.mutate({ id });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Packaging Materials</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Track packaging stock levels.</p>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
            </span>
          </div>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> Add Package
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold w-14">#</th>
                <th className="p-4 font-semibold">Package Type</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Added Stock</th>
                <th className="p-4 font-semibold">Total Stock</th>
                <th className="p-4 font-semibold">Supply</th>
                <th className="p-4 font-semibold">Closing Stock</th>
                <th className="p-4 font-semibold">Date Added</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center">
                  <Archive className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No packaging records found.</p>
                </td></tr>
              ) : (
                items.map((item: any) => {
                  const total = item.totalStock ?? ((item.stock ?? 0) + (item.addedStock ?? 0));
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 font-mono text-sm text-muted-foreground">#{item.id}</td>
                      <td className="p-4 font-medium text-white">{item.packageType}</td>
                      <td className="p-4 text-white text-sm">{item.stock}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">+{item.addedStock ?? 0}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${total < 50 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                          {total}
                        </span>
                      </td>
                      <td className="p-4 text-white text-sm">{item.supply ?? 0}</td>
                      <td className="p-4 text-white text-sm">{item.closingStock ?? 0}</td>
                      <td className="p-4 text-sm text-muted-foreground">{item.date ?? formatDate(item.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => openModal(item)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Package" : "Add Package"} description="Total stock = Stock + Added Stock">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Package Type</label>
            <Input {...register("packageType")} placeholder="e.g. Branded Bread Bags" error={errors.packageType?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Stock</label>
              <Input type="number" {...register("stock")} placeholder="0" error={errors.stock?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Added Stock</label>
              <Input type="number" {...register("addedStock")} placeholder="0" error={errors.addedStock?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Supply</label>
              <Input type="number" {...register("supply")} placeholder="0" error={errors.supply?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Closing Stock</label>
              <Input type="number" {...register("closingStock")} placeholder="0" error={errors.closingStock?.message} />
            </div>
          </div>
          <div className="pt-3 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Save Package"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
