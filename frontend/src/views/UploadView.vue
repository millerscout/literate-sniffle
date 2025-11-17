<script setup lang="ts">
import { ref, onMounted } from 'vue'

const selectedFile = ref<File | null>(null)
const uploadStatus = ref<string>('')
const isUploading = ref(false)
const uploadProgress = ref(0)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    uploadStatus.value = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
  }
}

const performUpload = async (file: File, resumeData?: any) => {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = resumeData?.fileId || Date.now().toString();

  // Sanitize filename for safe file operations
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  let uploadedChunks = resumeData?.uploadedChunks || [];
  for (let i = 0; i < chunks; i++) {
    if (uploadedChunks.includes(i)) continue;

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', chunks.toString());
    formData.append('fileName', safeFileName);
    try {
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      uploadedChunks.push(i);
      uploadProgress.value = Math.round(((uploadedChunks.length) / chunks) * 100);

      // Save progress to localStorage
      const uploadState = {
        fileId,
        fileName: safeFileName,
        chunks,
        uploadedChunks,
        timestamp: Date.now(),
        prompted: false,
      };
      localStorage.setItem(`upload_${fileId}`, JSON.stringify(uploadState));

    } catch (error) {
      console.error('Upload error:', error);
      uploadStatus.value = 'Upload failed. Will retry when online.';
      throw error;
    }
  }

  // Complete the upload
  try {
    const response = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, totalChunks: chunks }),
    });

    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(`CNAB validation failed: ${errorData.details || errorData.error}`);
      }
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Upload failed: ${errorData.error || errorData.details || response.statusText}`);
    }

    const result = await response.json();

    // Clear localStorage on success
    localStorage.removeItem(`upload_${fileId}`);
    uploadStatus.value = `Upload completed successfully! Format: ${result.format || 'Unknown'}`;
  } catch (error) {
    console.error('Completion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload completed but finalization failed.';
    uploadStatus.value = errorMessage;
    throw error;
  }
};

const uploadFile = async () => {
  if (!selectedFile.value) {
    uploadStatus.value = 'Please select a file first'
    return
  }

  // Store file reference to avoid issues if it gets cleared
  const fileToUpload = selectedFile.value;

  isUploading.value = true
  uploadProgress.value = 0
  uploadStatus.value = ''

  try {
    await performUpload(fileToUpload);
  } catch (error) {
    // If offline, ask user if they want to continue later
    if (!navigator.onLine) {
      const shouldContinue = confirm('Upload failed due to network issues. Would you like to continue uploading when you\'re back online?');
      if (shouldContinue) {
        // Save for later resumption
        const fileId = Date.now().toString();
        const safeFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadState = {
          fileId,
          fileName: safeFileName,
          chunks: Math.ceil(fileToUpload.size / (1024 * 1024)),
          uploadedChunks: [],
          timestamp: Date.now(),
          prompted: false,
        };
        localStorage.setItem(`upload_${fileId}`, JSON.stringify(uploadState));
        uploadStatus.value = 'Upload saved. Will resume when online.';
      }
    } else {
      // Check if it's a CNAB validation error
      const errorMessage = error instanceof Error ? error.message : 'Upload failed.';
      if (errorMessage.includes('CNAB validation failed')) {
        uploadStatus.value = errorMessage;
      } else {
        uploadStatus.value = 'Upload failed.';
      }
    }
  } finally {
    isUploading.value = false;
  }
};

// Resume pending uploads when coming back online
const resumePendingUploads = async () => {
  if (!navigator.onLine) return;

  const keys = Object.keys(localStorage).filter(key => key.startsWith('upload_'));
  for (const key of keys) {
    try {
      const uploadData = JSON.parse(localStorage.getItem(key)!);
      // Only ask if we haven't already prompted for this upload session
      if (!uploadData.prompted) {
        const shouldResume = confirm(`Would you like to resume uploading "${uploadData.fileName}"?`);
        if (shouldResume) {
          // Note: In a real app, you'd need to store the actual file data
          // For now, we'll just clean up the pending upload
          localStorage.removeItem(key);
          uploadStatus.value = `Resumed upload for ${uploadData.fileName}`;
        } else {
          // Mark as prompted so we don't ask again
          uploadData.prompted = true;
          localStorage.setItem(key, JSON.stringify(uploadData));
        }
      }
    } catch (error) {
      console.error('Error resuming upload:', error);
      localStorage.removeItem(key);
    }
  }
};

// Check for pending uploads on load
onMounted(() => {
  // Don't automatically resume on page load - only when coming back online
});

// Listen for online/offline events
window.addEventListener('online', resumePendingUploads);
</script>

<template>
  <div class="upload-section">
    <h2>File Upload</h2>

    <div class="file-input-container">
      <input
        type="file"
        @change="handleFileSelect"
        accept="*/*"
        class="file-input"
        :disabled="isUploading"
      >
    </div>

    <button
      @click="uploadFile"
      :disabled="!selectedFile || isUploading"
      class="upload-btn"
    >
      {{ isUploading ? 'Uploading...' : 'Upload File' }}
    </button>

    <div v-if="isUploading" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>
      <span class="progress-text">{{ uploadProgress }}%</span>
    </div>

    <div v-if="uploadStatus" class="status" :class="{
      'status-error': uploadStatus.includes('failed') || uploadStatus.includes('error') || uploadStatus.includes('CNAB validation') || uploadStatus.includes('finalization failed'),
      'status-success': uploadStatus.includes('successfully'),
      'status-info': uploadStatus.includes('Selected')
    }">
      {{ uploadStatus }}
    </div>
  </div>
</template>

<style scoped>
.upload-section {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.upload-section h2 {
  color: #42b883;
  margin-bottom: 1.5rem;
}

.file-input-container {
  margin-bottom: 1rem;
}

.file-input {
  display: block;
  width: 100%;
  padding: 0.5rem;
  border: 2px dashed #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;
}

.file-input:hover:not(:disabled) {
  border-color: #42b883;
}

.file-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
  margin-bottom: 1rem;
}

.upload-btn:hover:not(:disabled) {
  background: #369870;
}

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-container {
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #42b883;
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: bold;
  color: #42b883;
}

.status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-weight: bold;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
</style>