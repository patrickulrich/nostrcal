import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useBlossomServers } from "./useBlossomServers";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { effectiveServers } = useBlossomServers();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Use effective servers from BUD-03 implementation
      const servers = effectiveServers;

      console.log('🌸 Blossom upload starting with effective servers:', servers);
      console.log('📋 Server source: BUD-03 compliant effective servers');
      console.log('🔑 User pubkey:', user.pubkey);
      
      const uploader = new BlossomUploader({
        servers,
        signer: user.signer,
        expiresIn: 5 * 60 * 1000, // 5 minutes
      });

      const tags = await uploader.upload(file);
      console.log('✅ Blossom upload successful, tags:', tags);
      return tags;
    },
  });
}