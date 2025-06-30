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
      console.log('カメラアクセス要求中...');
      
      // より具体的な設定で要求
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('カメラアクセス許可取得成功');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 明示的にビデオを再生
        try {
          await videoRef.current.play();
          console.log('ビデオ再生開始');
        } catch (playError) {
          console.error('ビデオ再生エラー:', playError);
        }
        
        setIsStreaming(true);
        setError(null);
      } else {
        console.error('videoRef.current が見つかりません');
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

    // 元のビデオサイズ
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // ドット絵風にするためピクセル数を減らす（解像度を下げる）
    // 16bitゲーム機の一般的な解像度は320x240や256x224程度
    const pixelSize = 8; // ピクセルの大きさ
    const lowResWidth = Math.floor(originalWidth / pixelSize);
    const lowResHeight = Math.floor(originalHeight / pixelSize);

    // キャンバスのサイズを設定
    if (canvas.width !== originalWidth || canvas.height !== originalHeight) {
      // 最終出力サイズは元のビデオサイズと同じに
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      console.log('キャンバスサイズ設定:', canvas.width, 'x', canvas.height);
    }

    try {
      // 一時的な小さいキャンバスを作成（低解像度用）
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d', { willReadFrequently: true });
      tempCanvas.width = lowResWidth;
      tempCanvas.height = lowResHeight;

      // 小さいキャンバスにビデオを縮小描画（これがピクセレーション効果の鍵）
      tempContext.drawImage(video, 0, 0, lowResWidth, lowResHeight);
      
      // 小さいキャンバスから画像データを取得
      const imageData = tempContext.getImageData(0, 0, lowResWidth, lowResHeight);
      const data = imageData.data;

    // 色数を減らして16bit風に変換
    for (let i = 0; i < data.length; i += 4) {
      // より強い減色効果（5bit -> 4bit）- より極端な色の量子化
      // 実際の16bitは R5G6B5 (65536色) だが、よりレトロ感を出すため4bit (16色) 程度に
      data[i] = Math.round(data[i] / 16) * 16;      // R - 16段階
      data[i + 1] = Math.round(data[i + 1] / 16) * 16; // G - 16段階
      data[i + 2] = Math.round(data[i + 2] / 16) * 16; // B - 16段階
      
      // コントラストを上げて「はっきりした」感じにする
      data[i] = data[i] < 128 ? Math.max(0, data[i] - 16) : Math.min(255, data[i] + 16);
      data[i + 1] = data[i + 1] < 128 ? Math.max(0, data[i + 1] - 16) : Math.min(255, data[i + 1] + 16);
      data[i + 2] = data[i + 2] < 128 ? Math.max(0, data[i + 2] - 16) : Math.min(255, data[i + 2] + 16);
      
      // ディザリングを追加するためのノイズ（特定のピクセルに適用）
      if (Math.random() > 0.9) {
        const noiseAmount = 32; // より強いノイズ効果
        data[i] = Math.min(255, data[i] + noiseAmount);
        data[i + 1] = Math.min(255, data[i + 1] + noiseAmount);
        data[i + 2] = Math.min(255, data[i + 2] + noiseAmount);
      }
    }

      // 処理した画像データを小さいキャンバスに戻す
      tempContext.putImageData(imageData, 0, 0);
      
      // メインのキャンバスをクリア
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // 小さいキャンバスの内容を大きいキャンバスに拡大描画（ピクセル化効果）
      context.imageSmoothingEnabled = false; // 重要: スムージングを無効化してピクセル感を保持
      context.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);
      
      // オプション: CRTモニター風のオーバーレイ効果
      /*
      context.globalCompositeOperation = 'overlay';
      context.fillStyle = 'rgba(0, 20, 40, 0.1)'; // 微妙な青緑色のオーバーレイ
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
      */
      
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