import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ContractObligation } from '@/types/database';
import { ObligationService } from '@/services/ObligationService';

interface ObligationQRCodeProps {
  obligation: ContractObligation;
  size?: number;
  showActions?: boolean;
}

const ObligationQRCode = ({ obligation, size = 200, showActions = true }: ObligationQRCodeProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const qrUrl = ObligationService.generateObligationQRUrl(obligation.id);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "The completion link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with padding
    const padding = 20;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2 + 60; // Extra space for text

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      
      // Add title text
      ctx.fillStyle = 'black';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(obligation.title, canvas.width / 2, size + padding + 25);
      
      // Add frequency text
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(`Frequency: ${obligation.frequency}`, canvas.width / 2, size + padding + 45);

      // Download
      const link = document.createElement('a');
      link.download = `task-qr-${obligation.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Downloaded",
        description: "QR code has been downloaded.",
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Failed",
        description: "Please allow popups to print the QR code.",
        variant: "destructive",
      });
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Task QR Code - ${obligation.title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
            }
            h1 {
              margin: 20px 0 10px;
              font-size: 24px;
              color: #1f2937;
            }
            .frequency {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 10px;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #f3f4f6;
              border-radius: 8px;
              font-size: 12px;
              color: #4b5563;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${svgData}
            <h1>${obligation.title}</h1>
            <p class="frequency">Frequency: ${obligation.frequency}</p>
            <div class="instructions">
              <strong>Instructions:</strong><br>
              Scan this QR code with your phone camera to complete this task.
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{obligation.title}</CardTitle>
        <CardDescription>
          Scan to complete • {obligation.frequency}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div 
          ref={qrRef}
          className="flex justify-center p-4 bg-white rounded-lg"
        >
          <QRCodeSVG
            value={qrUrl}
            size={size}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: '/favicon.ico',
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>

        {/* URL Preview */}
        <div className="text-xs text-center text-muted-foreground break-all px-2">
          {qrUrl}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(qrUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ObligationQRCode;
