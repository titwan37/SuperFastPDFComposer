import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from 'next/image';

export function TipsDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thank you for using PDF Composer!</DialogTitle>
          <DialogDescription>
            This service is free. To cover infrastructure costs, please consider leaving a tip.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-sm text-muted-foreground">Scan the QR code with your PayPal app.</p>
          <div className="rounded-lg border p-2">
            <Image
              src="/paypal-qr.png"
              alt="PayPal QR Code for tips"
              width={200}
              height={200}
            />
          </div>
          <div className="flex w-full justify-around pt-2">
            <Button variant="outline" asChild>
              <a href="https://www.paypal.com/paypalme/your-username/1" target="_blank" rel="noopener noreferrer">$1</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://www.paypal.com/paypalme/your-username/2" target="_blank" rel="noopener noreferrer">$2</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://www.paypal.com/paypalme/your-username/5" target="_blank" rel="noopener noreferrer">$5</a>
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-center pt-4">
           <Button type="button" onClick={handleConfirm}>
            Continue to Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
