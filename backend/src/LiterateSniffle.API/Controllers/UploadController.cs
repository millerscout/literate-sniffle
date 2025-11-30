using Microsoft.AspNetCore.Mvc;
using LiterateSniffle.Core.Services;
using LiterateSniffle.Core.Exceptions;
using System.Text;

namespace LiterateSniffle.API.Controllers;

/// <summary>
/// Controller for handling CNAB file uploads
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly CNABParserService _parserService;
    private readonly FileUploadService _uploadService;
    private readonly ILogger<UploadController> _logger;
    private readonly string _uploadPath;

    public UploadController(
        CNABParserService parserService,
        FileUploadService uploadService,
        ILogger<UploadController> logger,
        IConfiguration configuration)
    {
        _parserService = parserService;
        _uploadService = uploadService;
        _logger = logger;
        _uploadPath = configuration["UploadPath"] ?? "uploads/temp";

        // Ensure upload directory exists
        Directory.CreateDirectory(_uploadPath);
    }

    /// <summary>
    /// Upload and process a CNAB file
    /// </summary>
    /// <param name="file">CNAB file to upload (must be 80-character fixed-width format)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Upload result with transaction count and file metadata</returns>
    /// <response code="200">CNAB file successfully uploaded, validated, and processed</response>
    /// <response code="400">Invalid file or CNAB format error</response>
    /// <response code="500">Server error during file processing</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        try
        {
            // Read file content
            string content;
            using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
            {
                content = await reader.ReadToEndAsync(cancellationToken);
            }

            // Validate file
            var (isValid, format, error) = _parserService.ValidateFile(content);
            if (!isValid)
            {
                return BadRequest(new { error = error ?? "Invalid CNAB file format" });
            }

            // Parse content
            var parsedData = _parserService.ParseContent(content);

            // Save file to disk
            var filename = $"{Guid.NewGuid()}.txt";
            var filePath = Path.Combine(_uploadPath, filename);
            await System.IO.File.WriteAllTextAsync(filePath, content, cancellationToken);

            // Store in database
            var fileUploadId = await _uploadService.StoreCNABDataAsync(
                filename,
                file.FileName,
                (int)file.Length,
                format ?? "CNAB-80",
                parsedData,
                cancellationToken);

            _logger.LogInformation("Successfully processed CNAB file: {FileName} with {TransactionCount} transactions",
                file.FileName, parsedData.Transactions.Count);

            return Ok(new
            {
                message = "CNAB file uploaded, validated, and data stored successfully",
                filename,
                originalName = file.FileName,
                size = (int)file.Length,
                mimetype = file.ContentType,
                format = format ?? "CNAB 80",
                transactionsCount = parsedData.Transactions.Count,
                fileUploadId
            });
        }
        catch (CNABParseException ex)
        {
            _logger.LogWarning(ex, "CNAB parsing error for file: {FileName}", file.FileName);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing file upload: {FileName}", file.FileName);
            return StatusCode(500, new { error = "An error occurred while processing the file" });
        }
    }

    /// <summary>
    /// Upload a file chunk (for chunked uploads)
    /// </summary>
    /// <param name="chunk">File chunk data</param>
    /// <param name="uploadId">Unique identifier for this upload session</param>
    /// <param name="chunkIndex">Index of this chunk (0-based)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Chunk upload confirmation</returns>
    /// <response code="200">Chunk uploaded successfully</response>
    /// <response code="400">Missing chunk data</response>
    [HttpPost("chunk")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadChunk(
        IFormFile chunk,
        [FromForm] string uploadId,
        [FromForm] int chunkIndex,
        CancellationToken cancellationToken)
    {
        if (chunk == null || chunk.Length == 0)
        {
            return BadRequest(new { error = "No chunk uploaded" });
        }

        try
        {
            var chunkPath = Path.Combine(_uploadPath, $"{uploadId}.chunk{chunkIndex}");
            
            using (var stream = new FileStream(chunkPath, FileMode.Create))
            {
                await chunk.CopyToAsync(stream, cancellationToken);
            }

            return Ok(new { message = "Chunk uploaded successfully", chunkIndex });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading chunk {ChunkIndex} for upload {UploadId}", chunkIndex, uploadId);
            return StatusCode(500, new { error = "An error occurred while uploading the chunk" });
        }
    }

    /// <summary>
    /// Complete a chunked upload and process the file
    /// </summary>
    /// <param name="uploadId">Unique identifier for the upload session</param>
    /// <param name="filename">Original filename</param>
    /// <param name="totalChunks">Total number of chunks that were uploaded</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Upload result with transaction count and file metadata</returns>
    /// <response code="200">File successfully assembled, validated, and processed</response>
    /// <response code="400">Missing chunks, invalid file format, or validation error</response>
    /// <response code="500">Server error during file assembly or processing</response>
    [HttpPost("complete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CompleteUpload(
        [FromForm] string uploadId,
        [FromForm] string filename,
        [FromForm] int totalChunks,
        CancellationToken cancellationToken)
    {
        try
        {
            // Combine chunks
            var finalPath = Path.Combine(_uploadPath, $"{uploadId}.txt");
            using (var finalStream = new FileStream(finalPath, FileMode.Create))
            {
                for (int i = 0; i < totalChunks; i++)
                {
                    var chunkPath = Path.Combine(_uploadPath, $"{uploadId}.chunk{i}");
                    if (!System.IO.File.Exists(chunkPath))
                    {
                        return BadRequest(new { error = $"Chunk {i} not found" });
                    }

                    using (var chunkStream = new FileStream(chunkPath, FileMode.Open))
                    {
                        await chunkStream.CopyToAsync(finalStream, cancellationToken);
                    }

                    // Delete chunk file
                    System.IO.File.Delete(chunkPath);
                }
            }

            // Read and process the complete file
            var content = await System.IO.File.ReadAllTextAsync(finalPath, cancellationToken);
            var fileInfo = new FileInfo(finalPath);

            // Validate file
            var (isValid, format, error) = _parserService.ValidateFile(content);
            if (!isValid)
            {
                System.IO.File.Delete(finalPath);
                return BadRequest(new { error = error ?? "Invalid CNAB file format" });
            }

            // Parse content
            var parsedData = _parserService.ParseContent(content);

            // Store in database
            var fileUploadId = await _uploadService.StoreCNABDataAsync(
                $"{uploadId}.txt",
                filename,
                (int)fileInfo.Length,
                format ?? "CNAB-80",
                parsedData,
                cancellationToken);

            _logger.LogInformation("Successfully processed chunked CNAB file: {FileName} with {TransactionCount} transactions",
                filename, parsedData.Transactions.Count);

            return Ok(new
            {
                message = "CNAB file uploaded, validated, and data stored successfully",
                filename = $"{uploadId}.txt",
                originalName = filename,
                size = (int)fileInfo.Length,
                format = format ?? "CNAB 80",
                transactionsCount = parsedData.Transactions.Count,
                fileUploadId
            });
        }
        catch (CNABParseException ex)
        {
            _logger.LogWarning(ex, "CNAB parsing error for chunked upload: {UploadId}", uploadId);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing chunked upload: {UploadId}", uploadId);
            return StatusCode(500, new { error = "An error occurred while processing the file" });
        }
    }
}
