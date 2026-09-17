# Judge path run (Studio Next)

Run on 2026-09-17 against the live deployment https://tracemint.vercel.app. Contract: [`0xA7225195035c80Fc6E9128112947B9bF87c7A5Dd`](https://explorer-studio-dev.genlayer.com/address/0xA7225195035c80Fc6E9128112947B9bF87c7A5Dd).

| Step | Transaction | Result |
|---|---|---|
| Register the demo work *Cybernetic Horizon*. Validators check that the creator's wallet appears on `/demo/portfolio`. | [0xa9e32cbc…](https://explorer-studio-dev.genlayer.com/tx/0xa9e32cbc99ad5473f02725347e9abfb58b8bfdada9dcd5193afcc48cd7fd3932) | `FINISHED_WITH_RETURN`, work id 1 |
| The agent scans the watched pages. It matches the shop image at hash distance 9 and the blog image at distance 0. | — | 2 candidates, 2 claims filed |
| Claim for `/demo/shop` | [0x63ad0b73…](https://explorer-studio-dev.genlayer.com/tx/0x63ad0b7337a226f0cedf0a9b2e08611e0f229af87bd2e5ec3e801ebe17cfe181) | `NOTICE_ISSUED`: `COPY_UNLICENSED`, `ADS_MERCH`, `PRIMARY`, fee 45 GEN, addressed to `0xa417…a3f6` |
| Claim for `/demo/blog` | [0x7266569b…](https://explorer-studio-dev.genlayer.com/tx/0x7266569bc72515cb7e3fcb612f9825bc7d80e0473443792f9056bd2ca89caca4) | `NO_NOTICE`: `COPY_LICENSED`, no fee |
| The site owner pays notice #1 (45 GEN) through the demo role. | [0x908aeda3…](https://explorer-studio-dev.genlayer.com/tx/0x908aeda31bf996ce5a8cc61649cccef58602fc7aa9caff386e5f3cfa96423c8e) | `FINISHED_WITH_RETURN`, 12-month license issued |
| The creator withdraws through the demo role. | [0x330cdc21…](https://explorer-studio-dev.genlayer.com/tx/0x330cdc217a9ff1c3da05aef3e7a6051a3613998148d9352014b047700eb37853) | `FINALIZED`; the creator wallet received 43.65 GEN |

Validator reasoning stored on chain:

- **Shop:** "Image 2 shows the same synthwave landscape as the registered work, with matching sun, mountain silhouettes, star field, grid perspective, and signature placement; any differences are limited to size/cropping. The page text indicates it is printed all-over on a hoodie product for sale, and neither the page nor the proof provides a license or permission from the creator."
- **Blog:** "Image 2 is identical to Image 1 (Cybernetic Horizon), and the page explicitly credits the work as 'Licensed from Demo Creator via TraceMint' with the matching non-exclusive web license."
