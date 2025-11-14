import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import { Coffee } from "lucide-react";

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
            This service is free! If you like it and use it, please consider supporting it.
            Help us to keeps this tool available for everyone. We thank you for your support.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2">
          {/* PayPal Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Via PayPal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-center text-sm text-muted-foreground">Scan the QR code or use a quick link.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-2">
                    <Image
                      src="/paypal-qrcode.png"
                      alt="PayPal QR Code for tips"
                      data-ai-hint="qr code"
                      width={150}
                      height={150}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
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
              </div>
            </CardContent>
          </Card>
          {/* Buy Me a Coffee Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Via Buy Me a Coffee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-2 pt-2">
                 <p className="text-center text-sm text-muted-foreground">Click the button below to leave a tip.</p>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-2">
                    <Image
                      src="/bmc_qrcode.png"
                      alt="Buy Me a Coffee QR Code for tips"
                      data-ai-hint="qr code"
                      width={150}
                      height={150}
                    />
                  </div>
                  <div className="flex w-full flex-row items-center justify-center gap-4 pt-4">
                    <Coffee className="h-16 w-16 text-yellow-500" />
                    <Button asChild className="bg-yellow-500 text-white hover:bg-yellow-600">
                      <a href="https://buymeacoffee.com/titwan" target="_blank" rel="noopener noreferrer">
                        Buy Me a Coffee
                      </a>
                    </Button>
                  </div>
                 </div>
              </div>
            </CardContent>
          </Card>
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
