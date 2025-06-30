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
    // willReadFrequently オプションを追加してパフォーマンス警告に対応
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // ビデオの準備状態をチェック
    if (video.readyState < 2) {
      console.log('ビデオがまだ準備できていません。状態:', video.readyState);
      requestAnimationFrame(apply16BitEffect);
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('ビデオのサイズが無効です:', video.videoWidth, 'x', video.videoHeight);
      requestAnimationFrame(apply16BitEffect);
      return;
    }

    // キャンバスのサイズをビデオと合わせる
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('キャンバスサイズ設定:', canvas.width, 'x', canvas.height);
    }

    try {
      // 映像をキャンバスに描画
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('ビデオ描画成功');
      
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
      console.log('16bit効果適用完了');
    } catch (err) {
      console.error('キャンバス処理エラー:', err);
      // エラーの詳細情報
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('キャンバスサイズエラー - width:', canvas.width, 'height:', canvas.height);
      }
    }

    // 次のフレームの処理
    if (isStreaming) {
      requestAnimationFrame(apply16BitEffect);
    }
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
      console.log('ストリーミング状態変更: 開始');
      requestAnimationFrame(apply16BitEffect);
    } else {
      console.log('ストリーミング状態変更: 停止');
    }
  }, [isStreaming]);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>16bit Camera</h1>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.cameraContainer}>
        {/* 元の映像（デバッグ用に表示） */}
        <video 
          ref={videoRef}
          className={styles.videoDebug} // デバッグ中は表示に
          autoPlay
          playsInline
          muted
          width={640}
          height={480}
          style={{ display: 'none' }} // スタイルで非表示
          onLoadedMetadata={(e) => {
            console.log('ビデオメタデータ読み込み完了:', e.target.videoWidth, 'x', e.target.videoHeight);
          }}
          onLoadedData={() => {
            console.log('ビデオデータ読み込み完了');
            // データ読み込み完了時に明示的にストリーミング開始
            if (videoRef.current && videoRef.current.readyState >= 2) {
              setIsStreaming(true);
            }
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