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
          <DialogTitle>Thank you for supporting PDF Composer!</DialogTitle>
          <DialogDescription>
            This service is free, but consider leaving a tip.
            Please support us to maintain this service for free, 
            we must cover infrastructure costs through Paypal.
            Thank you in advance.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-sm text-muted-foreground">Scan the QR code with your PayPal app.</p>
          <div className="rounded-lg border p-2">
            <Image
              src="https://picsum.photos/seed/paypal-qr/200/200"
              alt="PayPal QR Code for tips"
              data-ai-hint="qr code"
              width={200}
              height={200}
            />
          </div>
          <div className="flex w-full justify-around pt-2">
            <Button variant="outline" asChild>
              <a href="https://paypal.me/AntoineFalempin/1" target="_blank" rel="noopener noreferrer">$1</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://paypal.me/AntoineFalempin/2" target="_blank" rel="noopener noreferrer">$2</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://paypal.me/AntoineFalempin/5" target="_blank" rel="noopener noreferrer">$5</a>
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
