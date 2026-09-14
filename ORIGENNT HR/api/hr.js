export default async function handler(req, res) {
  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxYs-3m5_wcJYT4MG3m1O3_8_nW0Yn-rvRpkc0n1CccRoZSRWxKIVClXR0uGx1giPcs/exec';

  try {
    const params = new URLSearchParams(req.query);

    params.set('key', process.env.HR_API_SECRET);

    const response = await fetch(
      `${APPS_SCRIPT_URL}?${params.toString()}`
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Apps Script returned non-JSON response: ${text.slice(0, 120)}`
      );
    }

    return res
      .status(response.ok ? 200 : response.status)
      .json(data);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
