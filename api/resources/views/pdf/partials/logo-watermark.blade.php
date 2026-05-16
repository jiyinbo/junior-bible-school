@if(!empty($logoDataUri))
    <div style="position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: -1; text-align: center;">
        <img
            src="{{ $logoDataUri }}"
            alt=""
            style="width: {{ $width ?? '55%' }}; max-width: 420px; margin-top: {{ $marginTop ?? '28%' }}; opacity: {{ $opacity ?? 0.1 }};"
        />
    </div>
@endif
