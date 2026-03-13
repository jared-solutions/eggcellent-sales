import { useState } from 'react';
import { useDeposits, useCreateDeposit, useDeleteDeposit, useSupplyDepositSummary, Deposit } from '@/hooks/useDeposits';
import { useSupplies } from '@/hooks/useSupplies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'M-Pesa', label: 'M-Pesa' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
];

export default function DepositsPage() {
  const [filterSupply, setFilterSupply] = useState('');
  const { data: deposits = [], isLoading } = useDeposits(filterSupply || undefined);
  const { data: supplies = [] } = useSupplies();
  const { data: supplySummary = [] } = useSupplyDepositSummary(filterSupply || undefined);
  const createDeposit = useCreateDeposit();
  const deleteDeposit = useDeleteDeposit();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'Cash',
    notes: '',
    weekly_supply_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate: cannot deposit more than the remaining balance
    if (formData.weekly_supply_id && formData.amount) {
      const supplySummaryItem = supplySummary.find((s: any) => s.supply_id === formData.weekly_supply_id);
      if (supplySummaryItem) {
        const remainingBalance = supplySummaryItem.revenue - supplySummaryItem.deposited;
        const depositAmount = parseFloat(formData.amount);
        if (depositAmount > remainingBalance) {
          toast({ 
            title: `Cannot deposit more than remaining balance`, 
            description: `Maximum deposit allowed: KES ${remainingBalance.toLocaleString()}`,
            variant: 'destructive' 
          });
          return;
        }
      }
    }
    
    try {
      // Automatically set deposit_date to today's date
      const today = new Date().toISOString().split('T')[0];
      await createDeposit.mutateAsync({
        deposit_date: today,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
        weekly_supply_id: formData.weekly_supply_id || undefined,
      });
      toast({ title: 'Deposit recorded successfully' });
      setIsDialogOpen(false);
      setFormData({
        amount: '',
        payment_method: 'Cash',
        notes: '',
        weekly_supply_id: '',
      });
    } catch (error) {
      toast({ title: 'Failed to record deposit', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this deposit?')) {
      try {
        await deleteDeposit.mutateAsync(id);
        toast({ title: 'Deposit deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete deposit', variant: 'destructive' });
      }
    }
  };

  const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Deposits / Withdrawals</h1>
          <p className="text-muted-foreground">
            Record farmer withdrawals and profit shares
          </p>
        </div>
        
        {/* Supply Filter */}
        <div className="flex items-center gap-2">
          <Select value={filterSupply || 'all'} onValueChange={(value) => setFilterSupply(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by Supply Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supply Weeks</SelectItem>
              {supplies.map((supply) => (
                <SelectItem key={supply.id} value={supply.id}>
                  {format(new Date(supply.week_start_date), 'MMM d')} - {format(new Date(supply.week_end_date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Deposit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Deposit / Withdrawal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="weekly_supply">Week (Optional)</Label>
                <Select
                  value={formData.weekly_supply_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, weekly_supply_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Weeks</SelectItem>
                    {supplies.map((supply: any) => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {format(new Date(supply.week_start_date), 'MMM d')} - {format(new Date(supply.week_end_date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for withdrawal or additional details"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={createDeposit.isPending}>
                {createDeposit.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                Record Deposit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Total Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            KES {totalDeposits.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-sm text-muted-foreground">
            {deposits.length} transaction{deposits.length !== 1 ? 's' : ''} recorded
          </p>
        </CardContent>
      </Card>

      {/* Supply Deposit Summary Section */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Deposits by Supply</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue, deposited, and balance per supply week
          </p>
        </CardHeader>
        <CardContent>
          {supplySummary.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No supply data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Deposited</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplySummary.map((item: any) => (
                  <TableRow key={item.supply_id}>
                    <TableCell className="font-medium">
                      {item.week_start_date}
                    </TableCell>
                    <TableCell className="text-right">
                      KES {item.revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      KES {item.deposited.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      KES {item.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_cleared ? (
                        <Badge variant="default" className="bg-green-600">Cleared</Badge>
                      ) : (
                        <Badge variant="destructive">Uncleared</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.balance > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              amount: item.balance.toString(),
                              weekly_supply_id: item.supply_id,
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : deposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deposits recorded yet. Click "Record Deposit" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded At</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Cleared</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      {deposit.created_at ? format(new Date(deposit.created_at), 'MMM dd, yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(deposit.deposit_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {deposit.weekly_supply?.supply_date || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      KES {Number(deposit.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {deposit.payment_method || 'Not specified'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Find the supply summary for this deposit's supply
                        const supplyId = deposit.weekly_supply?.id;
                        const summary = supplySummary.find((s: any) => s.supply_id === supplyId);
                        if (!summary) return <Badge variant="outline">-</Badge>;
                        return summary.is_cleared ? (
                          <Badge className="bg-green-600">Cleared</Badge>
                        ) : (
                          <Badge variant="destructive">Uncleared</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {deposit.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(deposit.id)}
                        disabled={deleteDeposit.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
