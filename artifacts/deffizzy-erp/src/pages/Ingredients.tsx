import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, Wheat } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient,
  getListIngredientsQueryKey, Ingredient
} from "@workspace/api-client-react";
import { Button, Input, Modal } from "@/components/shared-ui";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  stock: z.coerce.number().min(0, "Must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Ingredients() {
  const { data: items = [], isLoading } = useListIngredients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Ingredient | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const createMutation = useCreateIngredient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        toast({ title: "Ingredient added successfully" });
        closeModal();
      }
    }
  });

  const updateMutation = useUpdateIngredient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        toast({ title: "Ingredient updated successfully" });
        closeModal();
      }
    }
  });

  const deleteMutation = useDeleteIngredient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        toast({ title: "Ingredient deleted" });
      }
    }
  });

  const openModal = (item?: Ingredient) => {
    if (item) {
      setEditingItem(item);
      reset({ name: item.name, stock: item.stock, unit: item.unit });
    } else {
      setEditingItem(null);
      reset({ name: "", stock: 0, unit: "kg" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...data } });
    } else {
      createMutation.mutate({ data: { ...data } });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this ingredient?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Ingredients</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Manage raw baking materials and stock.</p>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              Today: {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
            </span>
          </div>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> Add Ingredient
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold w-16">ID</th>
                <th className="p-4 font-semibold">Ingredient Name</th>
                <th className="p-4 font-semibold">Stock Level</th>
                <th className="p-4 font-semibold">Date Added</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center">
                  <Wheat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No ingredients logged.</p>
                </td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-mono text-sm text-muted-foreground">#{item.id}</td>
                    <td className="p-4 font-medium text-white">{item.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.stock < 10 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(item.createdAt)}</td>
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Ingredient" : "Add Ingredient"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Ingredient Name</label>
            <Input {...register("name")} placeholder="e.g. Flour" error={errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Stock</label>
              <Input type="number" step="0.01" {...register("stock")} placeholder="0" error={errors.stock?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Unit</label>
              <Input {...register("unit")} placeholder="e.g. kg, liters, bags" error={errors.unit?.message} />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Save Ingredient"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
