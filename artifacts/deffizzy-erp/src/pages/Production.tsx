import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, Factory } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListProductionBatches, useCreateProductionBatch, useUpdateProductionBatch, useDeleteProductionBatch,
  getListProductionBatchesQueryKey, ProductionBatch
} from "@workspace/api-client-react";
import { Button, Input, Modal } from "@/components/shared-ui";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  product: z.string().min(2, "Product is required"),
  quantityProduced: z.coerce.number().min(0, "Must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  baker: z.string().min(2, "Baker name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Production() {
  const { data: items = [], isLoading } = useListProductionBatches();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ProductionBatch | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { unit: "units" },
  });

  const createMutation = useCreateProductionBatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductionBatchesQueryKey() });
        toast({ title: "Batch recorded successfully" });
        closeModal();
      }
    }
  });

  const updateMutation = useUpdateProductionBatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductionBatchesQueryKey() });
        toast({ title: "Batch updated successfully" });
        closeModal();
      }
    }
  });

  const deleteMutation = useDeleteProductionBatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductionBatchesQueryKey() });
        toast({ title: "Batch deleted" });
      }
    }
  });

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      reset({ product: item.product, quantityProduced: item.quantityProduced, unit: item.unit ?? "units", baker: item.baker });
    } else {
      setEditingItem(null);
      reset({ product: "", quantityProduced: 0, unit: "units", baker: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: data as any });
    } else {
      createMutation.mutate({ data: data as any });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this batch record?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Production Log</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Record and manage daily baking batches.</p>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
            </span>
          </div>
        </div>
        <Button onClick={() => openModal()} variant="accent" className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> Log Batch
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold w-16">Batch #</th>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Qty Produced</th>
                <th className="p-4 font-semibold">Unit</th>
                <th className="p-4 font-semibold">Baker</th>
                <th className="p-4 font-semibold">Date Logged</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <Factory className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No production records found.</p>
                </td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-mono text-sm text-primary">#{item.id}</td>
                    <td className="p-4 font-medium text-white">{item.product}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {item.quantityProduced}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{item.unit ?? "units"}</td>
                    <td className="p-4 text-muted-foreground">{item.baker}</td>
                    <td className="p-4 text-sm text-muted-foreground">{item.date ?? formatDate(item.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => openModal(item)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Batch" : "Log Production Batch"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Product Name</label>
            <Input {...register("product")} placeholder="e.g. Sliced Bread" error={errors.product?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Qty Produced</label>
              <Input type="number" {...register("quantityProduced")} placeholder="0" error={errors.quantityProduced?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Unit</label>
              <Input {...register("unit")} placeholder="e.g. loaves, packs" error={errors.unit?.message} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Baker</label>
            <Input {...register("baker")} placeholder="e.g. John Doe" error={errors.baker?.message} />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="accent" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Log Batch"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
