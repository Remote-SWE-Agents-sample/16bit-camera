'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  // カメラストリームの開始
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('カメラへのアクセスエラー:', err);
      setError('カメラへのアクセスが拒否されたか、デバイスが利用できません');
    }
  };

  // カメラストリームの停止
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // 16bit風エフェクトの適用
  const apply16BitEffect = () => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // ビデオの準備状態をチェック
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      // ビデオがまだ準備できていない場合は次のフレームを要求して待機
      requestAnimationFrame(apply16BitEffect);
      return;
    }

    // キャンバスのサイズをビデオと合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 映像をキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // ピクセルデータを取得
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

    // 色数を減らして16bit風に変換
    for (let i = 0; i < data.length; i += 4) {
      // 各色チャンネル（RGB）を5bitの32段階に減色
      data[i] = Math.round(data[i] / 8) * 8;       // R
      data[i + 1] = Math.round(data[i + 1] / 8) * 8; // G
      data[i + 2] = Math.round(data[i + 2] / 8) * 8; // B
      
      // ディザリングを追加するためのノイズ（オプション）
      if (Math.random() > 0.95) {
        data[i] = Math.min(255, data[i] + 8);
        data[i + 1] = Math.min(255, data[i + 1] + 8);
        data[i + 2] = Math.min(255, data[i + 2] + 8);
      }
    }

      // 処理した画像データをキャンバスに戻す
      context.putImageData(imageData, 0, 0);
    } catch (err) {
      console.error('キャンバス処理エラー:', err);
      // エラーがあっても次のフレームを処理試行
    }

    // 次のフレームの処理
    requestAnimationFrame(apply16BitEffect);
  };

  // コンポーネントマウント時にカメラを開始
  useEffect(() => {
    startCamera();
    
    // コンポーネントのクリーンアップ時にカメラを停止
    return () => {
      stopCamera();
    };
  }, []);

  // ストリーミングが開始されたらエフェクトを適用
  useEffect(() => {
    if (isStreaming) {
      requestAnimationFrame(apply16BitEffect);
    }
  }, [isStreaming]);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>16bit Camera</h1>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.cameraContainer}>
        {/* 元の映像（非表示） */}
        <video 
          ref={videoRef}
          className={styles.hidden}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            console.log('ビデオメタデータ読み込み完了:', e.target.videoWidth, 'x', e.target.videoHeight);
          }}
          onLoadedData={() => {
            console.log('ビデオデータ読み込み完了');
          }}
          onPlay={() => {
            console.log('ビデオ再生開始');
            setIsStreaming(true);
          }}
        />
        
        {/* 16bit風に変換された映像 */}
        <canvas 
          ref={canvasRef}
          className={styles.canvas}
        />
      </div>
      
      <div className={styles.controls}>
        <button 
          className={styles.button}
          onClick={isStreaming ? stopCamera : startCamera}
        >
          {isStreaming ? 'カメラを停止' : 'カメラを開始'}
        </button>
      </div>
    </main>
  );
}