'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Loader2, Download, Play, Pause, Sparkles, Upload, FileAudio, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { createAITask } from '@/lib/parse-actions';
import { storageApi } from '@/lib/api';
import { copyText } from '@/lib/utils';

const voices = [
  { value: 'female1', label: '女声 - 温柔' },
  { value: 'female2', label: '女声 - 活力' },
  { value: 'male1', label: '男声 - 浑厚' },
  { value: 'male2', label: '男声 - 青年' },
  { value: 'child', label: '童声' },
];

const speeds = [
  { value: '0.75', label: '0.75x 慢速' },
  { value: '1', label: '1x 正常' },
  { value: '1.25', label: '1.25x 快速' },
  { value: '1.5', label: '1.5x 更快' },
];

const languages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'auto', label: '自动识别' },
];

export default function TextToSpeechPage() {
  const [activeTab, setActiveTab] = useState('tts');
  
  // TTS 状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('female1');
  const [speed, setSpeed] = useState('1');
  
  // 语音识别状态
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [language, setLanguage] = useState('auto');
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  // 文字转语音
  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('请输入要转换的文本');
      return;
    }
    
    if (!user?.objectId) {
      toast.error('请先登录');
      return;
    }

    setIsGenerating(true);
    setGeneratedAudio(null);
    
    try {
      const taskResult = await createAITask({
        designer: user.objectId,
        type: 'txt2speech',
        model: 'tts',
        data: {
          prompt: text,
          style: voice,
          quality: speed,
        },
        status: 0 as const,
      });
      
      if (!taskResult.success || !taskResult.data?.objectId) {
        throw new Error(taskResult.error || '创建任务失败');
      }
      
      toast.success('任务已提交，可在「AI任务」页面查看进度');
    } catch (error) {
      toast.error((error as Error).message || '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      toast.error('请上传音频文件 (mp3, wav, m4a, ogg, webm)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error('文件大小不能超过50MB');
      return;
    }
    
    setAudioFile(file);
    setUploadedFileUrl(null);
    setRecognizedText('');
  };

  // 上传文件
  const uploadFile = async (): Promise<string | null> => {
    if (!audioFile || !user?.objectId) return null;
    
    setIsUploading(true);
    try {
      const token = user.jwtToken;
      if (!token) throw new Error('未登录');

      const presign = await storageApi.presignUpload({
        filename: audioFile.name,
        content_type: audioFile.type || 'audio/mpeg',
        prefix: 'audio',
      });
      const uploadUrl = presign.upload_url;
      const fileUrl = presign.file_url;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioFile,
        headers: {
          'Content-Type': audioFile.type || 'audio/mpeg',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error('文件上传失败');
      }
      
      setUploadedFileUrl(fileUrl);
      toast.success('文件上传成功');
      return fileUrl;
    } catch (error) {
      toast.error((error as Error).message || '上传失败');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // 语音识别
  const handleRecognize = async () => {
    if (!audioFile) {
      toast.error('请先选择音频文件');
      return;
    }
    
    if (!user?.objectId) {
      toast.error('请先登录');
      return;
    }

    setIsRecognizing(true);
    setRecognizedText('');
    
    try {
      // 先上传文件
      let fileUrl = uploadedFileUrl;
      if (!fileUrl) {
        fileUrl = await uploadFile();
        if (!fileUrl) {
          throw new Error('文件上传失败');
        }
      }
      
      // 创建识别任务
      const taskResult = await createAITask({
        designer: user.objectId,
        type: 'speech2txt',
        model: 'whisper',
        data: {
          prompt: `语言: ${language}`,
          inputFile: fileUrl,
          style: language,
        },
        status: 0 as const,
      });
      
      if (!taskResult.success || !taskResult.data?.objectId) {
        throw new Error(taskResult.error || '创建任务失败');
      }
      
      toast.success('任务已提交，可在「AI任务」页面查看进度');
    } catch (error) {
      toast.error((error as Error).message || '识别失败，请稍后重试');
    } finally {
      setIsRecognizing(false);
    }
  };

  // 复制文本
  const handleCopy = async () => {
    const ok = await copyText(recognizedText);
    if (ok) {
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">语音转换</h1>
        <p className="text-muted-foreground">
          文字转语音 / 语音转文字
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tts">文字转语音</TabsTrigger>
          <TabsTrigger value="stt">语音识别</TabsTrigger>
        </TabsList>

        {/* 文字转语音 */}
        <TabsContent value="tts" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>文字输入</CardTitle>
                <CardDescription>输入您想要转换成语音的文本</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>文本内容 *</Label>
                  <Textarea
                    placeholder="请输入要转换的文本..."
                    className="min-h-[200px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {text.length} / 5000 字符
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>语音类型</Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择语音" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>语速</Label>
                    <Select value={speed} onValueChange={setSpeed}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择语速" />
                      </SelectTrigger>
                      <SelectContent>
                        {speeds.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      转换中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始转换
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>转换结果</CardTitle>
                <CardDescription>生成的语音将在这里播放</CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">正在转换中...</p>
                    </div>
                  </div>
                ) : generatedAudio ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20">
                      <Mic className="h-24 w-24 text-primary" />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            暂停
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            播放
                          </>
                        )}
                      </Button>
                      <Button size="lg" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        下载
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                    <div className="text-center">
                      <Mic className="mx-auto h-24 w-24 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        输入文本开始转换
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 语音识别 */}
        <TabsContent value="stt" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>上传音频</CardTitle>
                <CardDescription>上传音频文件进行语音识别</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {audioFile ? (
                    <>
                      <FileAudio className="h-12 w-12 text-primary mb-2" />
                      <p className="font-medium">{audioFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploadedFileUrl && (
                        <p className="text-xs text-green-600 mt-2 break-all max-w-full">
                          已上传: {uploadedFileUrl}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">点击上传音频文件</p>
                      <p className="text-sm text-muted-foreground">
                        支持 mp3, wav, m4a, ogg, webm，最大50MB
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>识别语言</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择语言" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRecognize}
                  disabled={isRecognizing || isUploading || !audioFile}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      上传中...
                    </>
                  ) : isRecognizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始识别
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>识别结果</CardTitle>
                <CardDescription>识别出的文字将显示在这里</CardDescription>
              </CardHeader>
              <CardContent>
                {isRecognizing ? (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">正在识别中...</p>
                    </div>
                  </div>
                ) : recognizedText ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="min-h-[200px] rounded-lg bg-muted p-4">
                      <p className="whitespace-pre-wrap">{recognizedText}</p>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={handleCopy}>
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            复制文本
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                    <div className="text-center">
                      <FileAudio className="mx-auto h-24 w-24 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        上传音频开始识别
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
