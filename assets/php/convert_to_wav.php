<?php
  header('Content-Type: application/json; charset=utf-8');

  $UPLOAD_FILESIZE_MAX = 100000000;
  $index = 'fileUpload';
  $response = array();
  $tmp_dir = dirname(dirname(__DIR__)) . '/tmp';

  try {
    // Undefined | Multiple Files | $_FILES Corruption Attack
    // If this request falls under any of them, treat it invalid.
    if (
      !isset($_FILES[$index]['error']) ||
      is_array($_FILES[$index]['error'])
    ) {
      throw new RuntimeException('Invalid parameters.');
    }

    // Check $_FILES[$index]['error'] value.
    switch ($_FILES[$index]['error']) {
      case UPLOAD_ERR_OK:
        break;
      case UPLOAD_ERR_NO_FILE:
        throw new RuntimeException('No file sent.');
      case UPLOAD_ERR_INI_SIZE:
      case UPLOAD_ERR_FORM_SIZE:
        throw new RuntimeException('Exceeded filesize limit.');
      default:
        throw new RuntimeException('Unknown errors.');
    }

    // You should also check filesize here.
    if ($_FILES[$index]['size'] > $UPLOAD_FILESIZE_MAX) {
      throw new RuntimeException('Exceeded filesize limit.');
    }

    // DO NOT TRUST $_FILES[$index]['type'] VALUE !!
    // Check MIME Type by yourself.
    $formats = array(
      'aif' => 'audio/x-aiff',
      'aiff' => 'audio/x-aiff',
      'm4a' => 'audio/x-m4a',
      'mp3' => 'audio/mpeg',
      'mp4' => 'video/mp4',
      'ogg' => 'audio/ogg'
    );
    $file = $_FILES[$index]['tmp_name'];
    $finfo = new finfo();

    $mimeType = $finfo->file($file, FILEINFO_MIME_TYPE);
    $finfoExt = $finfo->file($file, FILEINFO_EXTENSION);
    $pathExt = pathinfo($_FILES[$index]['name'], PATHINFO_EXTENSION);
    $ext = $finfoExt != '???' ? $finfoExt : $pathExt;

    if (!array_search($mimeType, $formats, true)) {
      throw new RuntimeException('Invalid file format.');
    }

    // You should name it uniquely.
    // DO NOT USE $_FILES[$index]['name'] WITHOUT ANY VALIDATION !!
    // On this example, obtain safe unique name from its binary data.
    // $tmp_dir = ini_get('upload_tmp_dir') ? ini_get('upload_tmp_dir') : sys_get_temp_dir();
    $sha = sha1_file($file);

    if (!move_uploaded_file(
      $file,
      sprintf($tmp_dir . '/%s.%s',
        $sha,
        $ext
      )
    )) {
      throw new RuntimeException('Failed to move uploaded file.');
    }

    $inFile = $tmp_dir . '/' . $sha . '.' . $ext;
    $outFile = explode('.', $inFile)[0] . '.wav';

    $execString = 'ffmpeg -y -i "' . $inFile . '" "' . $outFile . '"';

    $ffmpeg = system($execString, $resultCode);

    if ($resultCode != 0) {
      $response = array(
        // "sha" => $sha,
        // "ext" => $ext,
        // "inFile" => $inFile,
        // "outFile" => $outFile,
        // "finfoExt" => $finfoExt,
        // "pathExt" => $pathExt,
        // "file" => $_FILES[$index],
        // "tmpDir" => $tmp_dir,
        "size" => $_FILES[$index]['size'],
        "wavFile" => null,
        "status" => "error",
        "error" => true,
        "message" => "Server conversion failed"
      );
    } else {
      $response = array(
        // "sha" => $sha,
        // "ext" => $ext,
        // "inFile" => $inFile,
        // "outFile" => $outFile,
        // "finfoExt" => $finfoExt,
        // "pathExt" => $pathExt,
        // "file" => $_FILES[$index],
        // "tmpDir" => $tmp_dir,
        "size" => $_FILES[$index]['size'],
        "wavFile" => base64_encode($outFile),
        "status" => "success",
        "error" => false,
        "message" => "File uploaded and converted successfully"
      );
    }

    // remove original file in tmp_dir regardless of success
    // unlink($inFile);

    echo json_encode($response);

  } catch (RuntimeException $e) {
    $response = array(
      // "sha" => $sha,
      // "ext" => $ext,
      // "inFile" => $inFile,
      // "outFile" => $outFile,
      // "finfoExt" => $finfoExt,
      // "pathExt" => $pathExt,
      // "file" => $_FILES[$index],
      // "tmpDir" => $tmp_dir,
      "size" => $_FILES[$index]['size'],
      "wavFile" => null,
      "status" => "error",
      "error" => true,
      "message" => $e->getMessage()
    );
    echo json_encode($response);
  }
?>
