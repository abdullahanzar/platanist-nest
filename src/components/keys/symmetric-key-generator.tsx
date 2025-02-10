import React, { useState } from "react";
import forge from "node-forge";
import { Copy } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Alert, AlertTitle } from "../ui/alert";

const SecureKeyGenerator = () => {
  const [key, setKey] = useState("");

  const generateKey = () => {
    const randomBytes = forge.random.getBytesSync(32); // 256-bit key
    const base64Key = forge.util.encode64(randomBytes);
    setKey(base64Key);
  };

  const downloadKeyFile = () => {
    if (!key) return;
    const blob = new Blob([key], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "secure-key.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(key);
    alert("Key copied to clipboard!");
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <h2 className="text-2xl font-bold">Secure Symmetric Key Generator</h2>

      <Button onClick={generateKey}>
        Generate Key
      </Button>

      {key && (
        <Card className="w-full max-w-lg">
          <CardContent className="p-4 flex flex-col space-y-2">
            <Alert variant="destructive">
              <AlertTitle>Warning!</AlertTitle>
              <p>
                This key will not be stored anywhere. If you lose it, you will
                permanently lose access to any data encrypted with it. Store it
                securely, such as in a password manager.
              </p>
            </Alert>

            <div className="bg-gray-800 text-white font-mono p-2 rounded-lg text-sm break-all relative">
              {key}
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
                onClick={copyToClipboard}
              >
                <Copy size={18} />
              </button>
            </div>

            <Button onClick={downloadKeyFile} variant="secondary">
              Download as .txt
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecureKeyGenerator;
